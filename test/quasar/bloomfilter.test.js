const chai = require('chai')
  , should = chai.should()
  , BloomFilter = require('../../dist/quasar/bloomfilter').BloomFilter

describe('BloomFilter', function() {

  describe('serialize', function() {

    it('should return an array of 3 strings', function () {
      var a = new BloomFilter().serialize();
      a.should.be.instanceOf(Array);
      a.should.have.length(3);
      a[0].should.be.a('string');
    });

    it('should return a BloomFilter from an array of 3 strings', function () {
      var a = new BloomFilter().serialize();
      BloomFilter.deserialize(a).should.be.instanceOf(BloomFilter);
    });

    it('should return a BloomFilter from an array of more than 3 strings', function () {
      var a = new BloomFilter().serialize();
      a.push('test');
      BloomFilter.deserialize(a).should.be.instanceOf(BloomFilter);
    });

  });

});