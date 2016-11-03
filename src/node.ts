import { EventEmitter } from 'events';
import { QuasarNode } from './quasar';
import * as uuid from 'uuid';
import * as kad from 'kad';
import logger from './logger';

export interface Message {
  _id?:string;
  _from?:string;
  type?:string;
  [key:string]:any;
}

export type Seed = {
  address:string;
  port:number;
}

export type SeedRetriever = () => Promise<Seed[]>;

export interface NodeOptions {
  address?:string;
  port?:number;
  seeds:SeedRetriever;
  refresh?:number;
}

export class Node extends EventEmitter {
  public ready:Promise<Node> = null;
  private refCount:number = 0;
  private quasar:QuasarNode = null;
  private topics:Set<string> = new Set();
  readonly address:string;
  readonly port:number;
  readonly seeds:SeedRetriever;
  readonly refresh:number;

  protected constructor(opts:NodeOptions) {
    super();

    ({
      address: this.address = '0.0.0.0',
      port: this.port = 6545,
      seeds: this.seeds,
      refresh: this.refresh = 0
    } = opts);

    this.quasar = new QuasarNode({
      address: this.address,
      port: this.port,
      logger: logger('kad')
    });

    this.ready = this.seeds().then(([initialSeed,...otherSeeds]) => {
      return new Promise((resolve, reject) => {
        if (!initialSeed) {
          this.dispose();
          reject(new Error('no_seed'));
        } else {
          try {
            (this.quasar as any).connect(initialSeed, () => resolve(this)); // TODO add types for kad
          } catch(e) {
            reject(e);
          }
        }
      }).then(node => {
        if (otherSeeds && otherSeeds.length) {
          return this.updateSeeds(otherSeeds);
        } else {
          return node;
        }
      }).catch(err => {
        this.dispose();
        throw err;
      });
    });

    let k:string = Node.key(this.address, this.port);
    Node.nodes.set(k, this);
  }

  attach():this {
    this.refCount++;
    return this;
  }
  detach():void {
    if (--this.refCount < 1) {
      this.dispose();
    }
  }
  dispose():void {
    if (this.quasar) {
      (this.quasar as any).disconnect(); // TODO add types for kad
      this.quasar = null;
    }
    Node.nodes.delete(Node.key(this.address, this.port));
  }

  updateSeeds(seeds?:Seed[]):Promise<this> {
    return Promise.resolve(seeds).then(seeds => {
      return seeds || this.seeds();
    }).then(seeds => {
      var p = [];
      for (let i of seeds) {
        p.push(new Promise((resolve, reject) => {
          try {
            this.quasar.router.updateContact(new kad.contacts.AddressPortContact(i), resolve);
          } catch(e) {
            reject(e);
          }
        }));
      }
      return Promise.all(p);
    }).then(() => this);
  }

  private subscribe(topic:string):void {
    if (!this.topics.has(topic)) {
      this.quasar.subscribe(topic, this.emit.bind(this, topic));
      this.topics.add(topic);
    }
  }
  addListener(event:string, listener:Function): this {
    this.subscribe(event);
    return super.addListener(event, listener);
  }
  on(event:string, listener:Function): this {
    this.subscribe(event);
    return super.on(event, listener);
  }
  once(event: string,listener:Function): this {
    this.subscribe(event);
    return super.once(event, listener);
  }

  send(topic:string, msg:Message = {}): Message {
    msg._id = uuid.v4();
    this.quasar.publish(topic, msg);
    return msg;
  }

  static nodes:Map<string, Node> = new Map();
  static key(address:string, port:number):string {
    return address + ':' + port;
  }
  static get(opts:NodeOptions):Promise<Node> {
    let { address = '0.0.0.0', port = 6545 } = opts;
    let key:string = Node.key(address, port);
    let node:Node = Node.nodes.get(key);
    if (!node) {
      node = new Node(opts);
    }
    return node.attach().ready;
  }
}
