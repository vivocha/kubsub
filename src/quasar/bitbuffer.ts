/* derived from https://github.com/wiedi/node-bitbuffer */
/* originally Copyright (C) 2013 Sebastian Wiedenroth */

export class BitBuffer {
  constructor(number:number, public buffer?:Buffer) {
    let size = Math.ceil(number / 8);
    if (buffer != undefined && buffer.length == size) {
      this.buffer = buffer;
    } else {
      this.buffer = new Buffer(size);
      this.buffer.fill(0);
    }
  }
  set(index, bool) {
    let pos = index >>> 3;
    if(bool) {
      this.buffer[pos] |= 1 << (index % 8);
    } else {
      this.buffer[pos] &= ~(1 << (index % 8));
    }
  }
  get(index) {
    return (this.buffer[index >>> 3] & (1 << (index % 8))) != 0;
  }
  toggle(index) {
    this.buffer[index >>> 3] ^= 1 << (index % 8);
  }
  toBuffer() {
    return this.buffer;
  }
}
