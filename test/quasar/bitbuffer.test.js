const chai = require('chai')
  , should = chai.should()
  , BitBuffer = require('../../dist/quasar/bitbuffer').BitBuffer


describe('BitBuffer', function() {

  describe('constructor', function() {

    it('should create a buffer 2 bytes long to store 9 bits', function () {
      new BitBuffer(9).buffer.length.should.equal(2);
    });

    it('should create a buffer using an existing buffer', function () {
      var buf = new Buffer(2);
      new BitBuffer(9, buf).buffer.should.equal(buf);
    });

    it('should create a buffer ignoring an existing buffer if its size doesn\'t match the required one', function () {
      var buf = new Buffer(1);
      new BitBuffer(9, buf).buffer.should.not.equal(buf);
    });
  });

  describe('set/get/toggle', function() {

    it('should return false for unset bits', function () {
      var b = new BitBuffer(9);
      for (let i = 0 ; i < 9 ; i++) {
        b.get(i).should.equal(false);
      }
    });

    it('should set a bit to 1', function () {
      var b = new BitBuffer(9);
      b.set(2, true);
      b.get(2).should.equal(true);
    });

    it('should set a bit to 0', function () {
      var b = new BitBuffer(9);
      b.set(2, true);
      b.get(2).should.equal(true);
      b.set(2, false);
      b.get(2).should.equal(false);
    });

    it('should toggle a bit', function () {
      var b = new BitBuffer(9);
      b.toggle(2);
      b.get(2).should.equal(true);
      b.toggle(2);
      b.get(2).should.equal(false);
    });

  });

});