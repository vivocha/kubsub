const chai = require('chai')
  , should = chai.should()
  , FNV = require('../../dist/quasar/fnv').FNV


describe('FNV', function() {

  describe('update', function() {

    it('should throw is called with something other than string or Buffer', function () {
      var f = new FNV();
      (function() { f.update(5) }).should.throw(Error, "FNV.update expects String or Buffer");
    });

    it('should produce a binary string digest', function() {
      var f = new FNV();
      f.update('aaaaa');
      f.update('bbbbb');
      f.update('ccccc');
      f.digest().should.be.a('string');
    });

  });

});