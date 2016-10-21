import { Seed, Message, NodeOptions, Node } from './node';
import { Channel } from './channel'

export interface ClientOptions extends NodeOptions {
  namespace?:string;
}

export class Client {
  private namespace:string;
  private node:Promise<Node>;
  private channels:Set<Channel> = new Set();

  constructor(opts:ClientOptions) {
    ({ namespace: this.namespace = 'kubsub' } = opts);
    this.node = Node.get(opts);
  }
  connect():Promise<this> {
    return this.node.then(() => this);
  }
  disconnect():Promise<any> {
    for (let i of this.channels) {
      i.dispose();
    }
    return this.node.then(node => node.detach());
  }
  channel(name:string): Channel {
    return new Channel(name + '@' + this.namespace, this.node, this.channels);
  }
  send(channel:string, msg:Message): Promise<Message> {
    return this.node.then((node:Node) => node.send(channel + '@' + this.namespace, msg));
  }
  updateSeeds(seeds?:Seed[]):Promise<this> {
    return this.node.then(node => node.updateSeeds(seeds)).then(() => this);
  }
}