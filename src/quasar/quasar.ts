import { BloomFilter } from './bloomfilter';
import { knuthShuffle as shuffle } from './shuffle';
import * as uuid from 'uuid';
const LRUCache = require('lru-cache');
const kad = require('kad');

export interface QuasarOptions {
  maxRelayHops?:number,
  randomRelay?:boolean,
  lruCacheSize?:number,
  logger?:any
}

/**
 * Implements the Quasar routing protocol given a `kad.Router`
 * @constructor
 * @param {kad.Router} router - The router instance to use
 * @param {Object} [options]
 * @param {Number} [options.lruCacheSize=50] - Max size of the publication
 * uuid cache
 * @param {Number} [options.maxRelayHops=3] - The number of hops a message
 * travels in a single direction
 * @param {Boolean} [options.randomRelay=false] - If true, don't perform
 * aggressive bloom filter update loop with neighbors before relaying
 * @see research.microsoft.com/en-us/um/people/saikat/pub/iptps08-quasar.pdf
 */
export class Quasar {
  static DEFAULTS:QuasarOptions = {
    maxRelayHops: kad.constants.ALPHA,
    randomRelay: false,
    lruCacheSize: 50
  };
  static PUBLISH_METHOD = 'PUBLISH';
  static SUBSCRIBE_METHOD = 'SUBSCRIBE';
  static UPDATE_METHOD = 'UPDATE';

  private _router:any;
  private _options:QuasarOptions;
  private _groups:{
    [topic:string]: (data:any, topic:string)=>void
  } = {};
  private _bf:BloomFilter = new BloomFilter();
  private _seen:any;
  private _log:any;
  private _protocol:{
    [method:string]: (params:any, callback:(...args:any[])=>void)=>void;
  };

  constructor(router, options = {}) {
    if (!(router instanceof kad.Router)) throw new Error('Invalid router supplied');

    this._router = router;
    this._options = Object.create(Quasar.DEFAULTS);
    Object.assign(this._options, options);
    this._protocol = {};
    this._seen = new LRUCache(this._options.lruCacheSize);
    this._log = this._options.logger || this._router._log;

    this._protocol[Quasar.PUBLISH_METHOD] = this._handlePublish.bind(this);
    this._protocol[Quasar.SUBSCRIBE_METHOD] = this._handleSubscribe.bind(this);
    this._protocol[Quasar.UPDATE_METHOD] = this._handleUpdate.bind(this);

    this._router._rpc.before('receive', kad.hooks.protocol(this._protocol));
    this._bf.filters[0].add(this._router._self.nodeID);
  }

  /**
   * Publish some data for the given topic
   * @param {String} topic - The publication identifier
   * @param {Object} data - Arbitrary publication contents
   * @param {Object} options
   * @param {String} options.key - Use neighbors close to this key (optional)
   */
  publish(topic:string, data:any, options?:{ key?:string }):Promise<any> {
    let nodeID = this._router._self.nodeID;
    let limit = kad.constants.ALPHA;
    let key = options ? (options.key || nodeID) : nodeID;
    let neighbors = this._router.getNearestContacts(key, limit, nodeID);

    this._log.info('publishing message on topic "%s"', topic);

    // Dispatch message to our closest neighbors
    let p = [];
    for (let n of neighbors) {
      p.push(this._sendPublish(n, {
        uuid: uuid.v4(),
        topic: topic,
        contents: data,
        publishers: [nodeID],
        ttl: this._options.maxRelayHops,
        contact: this._router._self
      }));
    }
    return Promise.all(p);
  }

  /**
   * Subscribe to the given topic and handle events
   * @param {String|Array} topic - The publication identifier(s)
   * @param {Function} callback - Function to call when publication is received
   */
  subscribe(topic:string|string[], callback:(data:any, topic?:string)=>void):void {
    let _addTopicToBloomFilter = topic => {
      this._log.info('subscribing to topic "%s"', topic);
      this._bf.filters[0].add(topic);
      // Set a handler for when we receive a publication we are interested in
      this._groups[topic] = callback;
    }

    // Update our ABF with our subscription information, add our negative
    // information, then update our neighbors with our bloom filters
    if (Array.isArray(topic)) {
      topic.forEach(_addTopicToBloomFilter);
    } else {
      _addTopicToBloomFilter(topic);
    }

    this._sendUpdatesToNeighbors();
  }

  /**
   * Implements the Quasar join protocol
   * @private
   */
  private _sendUpdatesToNeighbors():void {
    var nodeID = this._router._self.nodeID;
    var limit = kad.constants.ALPHA;

    // Get our nearest overlay neighbors
    var neighbors = this._router.getNearestContacts(nodeID, limit, nodeID);

    this._log.debug('requesting neighbors\' bloom filters');

    // Get neighbors bloom filters and merge them with our own
    this._updateAttenuatedBloomFilter(neighbors).then(() => {
      // Send our neighbors our merged bloom filters
      for (var n = 0; n < neighbors.length; n++) {
        this._updateNeighbor(neighbors[n]);
      }
    });
  }

  /**
   * Iteratitvely update our local bloom filters with our neighbors'
   * @private
   * @param {Array} neighbors
   * @param {Function} callback
   */
 private _updateAttenuatedBloomFilter(neighbors):Promise<any> {
    let p = Promise.resolve(true);

    for (let n of neighbors) {
      p = p.then(() => this._getBloomFilterFromNeighbor(n)).then((atbf: BloomFilter) => {
        this._log.info('merging neighbor\'s bloom filter with our own');
        // Merge the remote copy of the bloom filter with our own
        this._applyAttenuatedBloomFilterUpdate(atbf);
      }, (err: Error) => {
        this._log.warn('failed to get neighbor\'s bloom filter, reason: %s', err.message);
      });
    }
    return p;
  }

  /**
   * Merges the attenuated bloom filter with our own
   * @private
   * @param {BloomFilter} atbf
   */
  private _applyAttenuatedBloomFilterUpdate(atbf) {
    // Iterate for the depth of our bitfield minus our view of neighbors
    for (var f = 1; f < this._bf.depth; f++) {
      // Then for each bloom filter in our neighbor's response, merge their
      // bloom filter with ours for the given "hop" in our attenuated filter
      for (var b = 0; b < atbf.filters[f].bitfield.buffer.length; b++) {
        var local = this._bf.filters[f].bitfield.buffer;
        var remote = atbf.filters[f].bitfield.buffer;

        local[b] += remote[b];
      }
    }

    return this._bf;
  }

  /**
   * Sends a PUBLISH message after verifying it has not expired
   * @private
   * @param {kad.Contact} contact
   * @param {Object} params
   * @param {Function} callback
   */
  _sendPublish(contact, params):Promise<any> {
    return new Promise((resolve, reject) => {
      // check to make sure the message we are sending hasn't expired:
      if (params.ttl < 1) {
        reject(new Error('outgoing PUBLISH message has expired'));
      } else {
        this._router._rpc.send(contact, kad.Message({
          params: Object.assign({}, params, {
            contact: this._router._self,
            ttl: --params.ttl
          }),
          method: Quasar.PUBLISH_METHOD
        }), (err, data) => {
          if (err) {
            reject(err);
          } else {
            resolve(data);
          }
        });
      }
    });
  }

  /**
   * Inspects the message and routes it accordingly
   * @private
   * @param {Object} params
   * @param {Function} callback
   */
  _handlePublish(params, callback) {
    /* jshint maxstatements:false */
    var neighbors = this._router.getNearestContacts(
      this._router._self.nodeID,
      kad.constants.K,
      this._router._self.nodeID
    );

    // Check to make sure that we have not already seen this message
    if (this._seen.get(params.uuid)) {
      return callback(new Error('Message previously routed'));
    }

    if (params.ttl > this._options.maxRelayHops || params.ttl < 0) {
      return callback(new Error('Refusing to relay message due to invalid TTL'));
    }

    // Filter the neighbor list of previous publishers
    neighbors = shuffle(neighbors.filter(function (contact) {
      return params.publishers.indexOf(contact.nodeID) === -1;
    })).splice(0, 3);

    // Add ourselves to the publishers (negative information)
    params.publishers.push(this._router._self.nodeID);
    this._seen.set(params.uuid, Date.now());

    // Check if we are subscribed to this topic
    if (this._bf.filters[0].has(params.topic) && this._groups[params.topic]) {
      // If we are, then execute our subscription handler
      this._groups[params.topic](params.contents, params.topic);

      let p = Promise.resolve(true);
      for (let n of neighbors) {
        p = p.then(() => this._sendPublish(n, params));
      }
      p.then(() => callback());
    } else {
      // We are not interested in this message, so let's forward it on to our
      // neighbors to see if any of them are interested
      this._relayPublication(neighbors, params).then(data => callback(null, data), err => callback(err));
    }
  }

  /**
   * Relays the message to the given neighbors
   * @private
   * @param {Array} neighbors
   * @param {Object} params
   * @param {Function} callback
   */
  private _relayPublication(neighbors, params):Promise<any> {
    var nodeID = this._router._self.nodeID;

    let _relayToRandomNeighbor = () => {
      var randNeighbor = this._getRandomOverlayNeighbor(nodeID, params.topic);
      this._sendPublish(randNeighbor, params);
    }

    if (this._options.randomRelay) {
      _relayToRandomNeighbor();
    } else {
      var p = [];
      for (let n of neighbors) {
        p.push(this._getBloomFilterFromNeighbor(n).then(atbf => {
          // We iterate over the total number of hops in our bloom filter
          for (var i = 0; i < this._bf.depth; i++) {

            // Check if their bloom filter for the given hop contains the topic
            if (atbf.filters[i].has(params.topic)) {
              var negativeRT = false;

              // Check if their bloom filter contains any of the negative
              // information for the previous message publishers
              for (var p = 0; p < params.publishers.length; p++) {
                if (atbf.filters[i].has(params.publishers[p])) {
                  negativeRT = true;
                }
              }

              // If there is isn't any negative information, then let's relay the
              // message to the contact
              if (!negativeRT) {
                return this._sendPublish(n, params).then(() => true, () => true);
              }
            }
          }

          // Nothing to do, all done
          return false;
        }, () => false));
      }

      Promise.all(p).then(results => results.filter(i => !!i)).then(results => {
        if (!results || !results.length) {
          // If none of the neighbors in the above loop should get the message
          // then we must pick a random overlay neighbor and send it to them
          _relayToRandomNeighbor();
        }
      });
    }

    // Ack the original sender, so they do not drop us from routing table
    return Promise.resolve({});
  }

  /**
   * Inspects the message and routes it accordingly
   * @private
   * @param {Object} params
   * @param {Function} callback
   */
  _handleSubscribe(params, callback) {
    callback(null, {filters: this._bf.serialize()});
  }

  /**
   * Inspects the message and routes it accordingly
   * @private
   * @param {Object} params
   * @param {Function} callback
   */
  _handleUpdate(params, callback) {
    this._applyAttenuatedBloomFilterUpdate(
      BloomFilter.deserialize(params.filters)
    );

    callback(null, {});
  }

  /**
   * Request a copy of the contact's attenuated bloom filter (SUBSCRIBE)
   * @private
   * @param {kad.Contact} contact
   * @param {Function} callback
   */
  private _getBloomFilterFromNeighbor(contact):Promise<BloomFilter> {
    return new Promise((resolve, reject) => {
      // Construct our SUBSCRIBE message
      let message = kad.Message({
        method: Quasar.SUBSCRIBE_METHOD,
        params: {contact: this._router._self}
      });

      this._router._rpc.send(contact, message, function (err, message) {
        if (err) {
          reject(err);
        } else if (!message.result.filters) {
          reject(new Error('Invalid response received'));
        } else if (!Array.isArray(message.result.filters)) {
          reject(new Error('Invalid response received'));
        } else {
          try {
            resolve(BloomFilter.deserialize(message.result.filters));
          } catch (err) {
            reject(new Error('Failed to deserialize bloom filter'));
          }
        }

      });
    });
  }

  /**
   * Send the contact our updated attenuated bloom filter
   * @private
   */
  private _updateNeighbor(contact):void {
    var self = this;

    // Construct our UPDATE message
    var message = kad.Message({
      method: Quasar.UPDATE_METHOD,
      params: {
        filters: this._bf.serialize(),
        contact: this._router._self
      }
    });

    this._router._rpc.send(contact, message, function (err) {
      if (err) {
        self._log.warn('failed to update neighbor with bloom filter');
      }
    });
  }

  /**
   * Returns a random contact for the given topic
   * @private
   * @param {String} nodeID
   * @param {String} topic
   * @returns {kad.Contact}
   */
  private _getRandomOverlayNeighbor(nodeID:string, topic:string) {
    var randIndex = kad.utils.getBucketIndex(nodeID, kad.utils.createID(topic));
    var randBucket = kad.utils.getRandomInBucketRangeBuffer(randIndex);
    var randKey = kad.utils.createID(randBucket);

    return shuffle(
      this._router.getNearestContacts(randKey, kad.constants.K, nodeID)
    )[0];
  }

}
