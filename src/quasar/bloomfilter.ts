import { Bloem } from './bloem';
const kad = require('kad');

/**
 * Implements an Attenuated Bloom Filter
 * @constructor
 */
export class BloomFilter {
  size: number = kad.constants.B;
  depth: number = kad.constants.ALPHA;
  filters: Bloem[] = [];

  constructor() {
    for (var i = 0; i < this.depth; i++) {
      this.filters.push(new Bloem(this.size, 2));
    }
  }

  /**
   * Serializes the bloom filter into a series of hex strings
   * @returns {Array}
   */
  serialize():string[] {
    let filters:string[] = [];

    for (let i = 0; i < this.filters.length; i++) {
      filters.push(this.filters[i].bitfield.toBuffer().toString('hex'));
    }

    return filters;
  }

  /**
   * Deserializes the bloom filter from a series of hex strings
   * @param {Array} filters - Array of hex encoded bloom filters
   * @returns {BloomFilter}
   */
  static deserialize(filters:string[]):BloomFilter {
    var bf = new BloomFilter();

    for (var i = 0; i < filters.length; i++) {
      if (bf.filters[i]) {
        bf.filters[i].bitfield.buffer = new Buffer(filters[i], 'hex');
      } else {
        return bf;
      }
    }

    return bf;
  }
}
