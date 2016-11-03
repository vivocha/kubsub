declare module "kad" {

  export interface Bucket {

  }

  export interface Contact {

  }

  export interface Logger {
    log: (...args)=>void,
    info: (...args)=>void,
    warn: (...args)=>void,
    error: (...args)=>void,
    debug: (...args)=>void
  }

  export interface Message {

  }

  export interface NodeOptions {
    logger?: Logger,
    transport?: any,
    router?: any,
    storage?: any,
    validator?: (key: string, value: string, callback: (result: boolean)=>void)=>void
  }

  export class Node {
    constructor(opts: NodeOptions);
  }

  export class Router {
    constructor(opts: NodeOptions);
  }

  export class RPC {

  }

  export namespace contacts {
    export interface AddressPortContactOptions {
      address: string,
      port: number
    }
    export class AddressPortContact {
      constructor(options: AddressPortContactOptions);
    }
  }

  export namespace transports {
    export class UDP {
      constructor(contact: contacts.AddressPortContact, options: NodeOptions);
    }
  }

  export namespace hooks {

  }

  export namespace storage {
    export class MemStore {
    }
  }

  export namespace utils {

  }

  export namespace constants {

  }
}