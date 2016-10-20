import { EventEmitter } from 'events';
import { Message, Node } from './node';
import * as uuid from 'uuid';


export class Channel extends EventEmitter {
  readonly id:string;

  constructor(private channel:string, private node:Promise<Node>) {
    super();
    this.id = uuid.v4();
    this.node.then((node:Node) => {
      node.on(channel, (msg:Message) => {
        if (msg && typeof msg === 'object' && msg._from !== this.id) {
          delete msg._from;
          this.emit('data', msg);
          if (msg.type) {
            this.emit(msg.type, msg);
          }
        }
      });
      this.emit('ready');
    });
  }
  send(msg:Message = {}): Promise<Message> {
    msg._from = this.id;
    return this.node.then((node:Node) => node.send(this.channel, msg));
  }
}