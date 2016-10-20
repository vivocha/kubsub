import { EventEmitter } from 'events';
import * as uuid from 'uuid';
import logger from './logger';

const kad = require('kad');
const Quasar = require('kad-quasar').Protocol;

export interface Message {
  _id?:string;
  _from?:string;
  type?:string;
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
  private router:any = null;
  private quasar:any = null;
  private node:any = null;
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

    let storage = new kad.storage.MemStore();
    let contact = new kad.contacts.AddressPortContact({ address: this.address, port: this.port });
    let transport = new kad.transports.UDP(contact, {
      logger: logger('kad-transport')
    });
    this.router = new kad.Router({
      transport: transport,
      logger: logger('kad-router')
    });
    this.quasar = new Quasar(this.router);
    this.node = new kad.Node({
      transport: transport,
      router: this.router,
      logger: logger('kad-node'),
      storage: storage
    });

    this.ready = this.seeds().then(([initialSeed,...otherSeeds]) => {
      return new Promise((resolve, reject) => {
        if (!initialSeed) {
          this.dispose();
          reject(new Error('no_seed'));
        } else {
          this.node.connect(initialSeed, err => {
            if (err) {
              reject(err);
            } else {
              resolve(this);
            }
          });
        }
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
    if (this.node) {
      this.node.disconnect();
      this.node = null;
    }
    Node.nodes.delete(Node.key(this.address, this.port));
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
  send(topic:string, msg:Message): Message {
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
