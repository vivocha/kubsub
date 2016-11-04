import { Seed, Message, NodeOptions, Node } from './node';
import { Channel } from './channel'

export interface ClientOptions extends NodeOptions {
  namespace?:string;
}

export class Client {
  static DEFAULT_ADDRESS:string = Node.DEFAULT_ADDRESS;
  static DEFAULT_PORT:number = Node.DEFAULT_PORT;
  static DEFAULT_NAMESPACE:string = 'kubsub';

  private namespace:string;
  private node:Promise<Node>;
  private channels:Set<Channel> = new Set();

  constructor(opts:ClientOptions) {
    ({ namespace: this.namespace = Client.DEFAULT_NAMESPACE } = opts);
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
  get address():Promise<string> {
    return this.node.then(node => node.address);
  }
  get port():Promise<number> {
    return this.node.then(node => node.port);
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

  static create(opts:ClientOptions):Promise<Client> {
    return (new Client(opts)).connect();
  }
}