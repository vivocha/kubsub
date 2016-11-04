import { EventEmitter } from 'events';
import { Message, Node } from './node';
import * as uuid from 'uuid';


export class Channel extends EventEmitter {
  readonly id:string;
  readonly handler:(msg:Message)=>void;

  constructor(private channel:string, private node:Promise<Node>, private registry:Set<Channel>) {
    super();
    this.id = uuid.v4();
    this.handler = (msg:Message) => {
      if (msg && typeof msg === 'object' && msg._from !== this.id) {
        delete msg._from;
        this.emit('data', msg);
        if (msg.type) {
          this.emit(msg.type, msg);
        }
      }
    };
    this.node.then((node:Node) => {
      node.on(channel, this.handler);
      this.registry.add(this);
      this.emit('ready');
    });
  }
  dispose():void {
    this.node.then((node:Node) => node.removeListener(this.channel, this.handler));
    this.node = undefined;
    this.registry.delete(this);
  }
  send(msg:Message): Promise<Message> {
    msg._from = this.id;
    return this.node.then((node:Node) => node.send(this.channel, msg));
  }
}