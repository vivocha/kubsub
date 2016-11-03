/* derived from https://github.com/wiedi/node-bloem */
/* originally Copyright (C) 2013 Sebastian Wiedenroth */

import { BitBuffer } from './bitbuffer';
import { FNV } from './fnv';

function calulateHashes(key:string|Buffer, size:number, slices:number):number[] {
  /* See:
   * "Less Hashing, Same Performance: Building a Better Bloom Filter"
   * 2005, Adam Kirsch, Michael Mitzenmacher
   * http://citeseerx.ist.psu.edu/viewdoc/summary?doi=10.1.1.72.2442
   */
  function fnv(seed, data) {
    var h = new FNV();
    h.update(seed);
    h.update(data);
    return h.value() >>> 0;
  }
  var h1 = fnv(new Buffer("S"), key);
  var h2 = fnv(new Buffer("W"), key);
  var hashes = [];
  for(var i = 0; i < slices; i++) {
    hashes.push((h1 + i * h2) % size);
  }
  return hashes;
}

export class Bloem {
  bitfield: BitBuffer;

  constructor(private size: number, private slices: number, buffer?: Buffer) {
    this.bitfield = new BitBuffer(size, buffer)
  }

  add(key: string): void {
    let hashes = calulateHashes(key, this.size, this.slices);
    for (let i = 0; i < hashes.length; i++) {
      this.bitfield.set(hashes[i], true);
    }
  }

  has(key: string): boolean {
    let hashes = calulateHashes(key, this.size, this.slices);
    for (let i = 0; i < hashes.length; i++) {
      if (!this.bitfield.get(hashes[i])) return false;
    }
    return true
  }

  static destringify(data: Bloem) {
    let filter = new Bloem(data.size, data.slices);
    filter.bitfield.buffer = new Buffer(data.bitfield.buffer);
    return filter;
  }
}