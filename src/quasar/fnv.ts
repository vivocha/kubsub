/* derived from https://github.com/wiedi/node-fnv */
/* originally Copyright (C) 2013 IETF Trust and Sebastian Wiedenroth. All rights reserved. */
/* implement http://tools.ietf.org/html/draft-eastlake-fnv-04 */

export class FNV {
  private hash:number;

  constructor() {
    this.hash = 0x811C9DC5; /* offset_basis */
  }
  update(data:string|Buffer):this {
    if(typeof data === 'string') {
      data = new Buffer(data)
    } else if(!(data instanceof Buffer)) {
      throw Error("FNV.update expects String or Buffer")
    }
    for(let i = 0; i < data.length; i++) {
      this.hash = this.hash ^ data[i];
      /* 32 bit FNV_Prime = 2**24 + 2**8 + 0x93 */
      this.hash += (this.hash << 24) + (this.hash << 8) + (this.hash << 7) + (this.hash << 4) + (this.hash << 1)
    }
    // Make API chainable
    return this;
  }
  digest(encoding:string):string {
    encoding = encoding || "binary";
    let buf = new Buffer(4);
    buf.writeInt32BE(this.hash & 0xffffffff, 0);
    return buf.toString(encoding);
  }
  value():number {
    return this.hash & 0xffffffff
  }
}
