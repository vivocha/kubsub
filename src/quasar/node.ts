import { Quasar } from './quasar';
import * as kad from 'kad';

export interface QuasarNodeOptions extends kad.NodeOptions {
  address?:string,
  port?:number
}

export class QuasarNode extends kad.Node {
  public router:any;
  private quasar:Quasar;

  constructor(opts:QuasarNodeOptions = {}) {
    if (!opts.storage) {
      opts.storage = new kad.storage.MemStore();
    }
    if (!opts.transport) {
      if (!opts.address || !opts.port) throw new Error('either transport or address and port must be specified');

      let contact = new kad.contacts.AddressPortContact({address: opts.address, port: opts.port});
      opts.transport = new kad.transports.UDP(contact, {
        logger: opts.logger
      });
    }
    if (!opts.router) {
      opts.router = new kad.Router({
        transport: opts.transport,
        logger: opts.logger
      });
    }
    super(opts);
    this.router = opts.router;
    this.quasar = new Quasar(this.router);
  }

  publish(topic:string, data:any, options?:{ key?:string }):void {
    this.quasar.publish(topic, data, options);
  }

  subscribe(topic:string, callback:(data:any, topic?:string)=>void):void {
    this.quasar.subscribe(topic, callback);
  }
}
