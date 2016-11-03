const chai = require('chai')
  , should = chai.should()
  , Bloem = require('../../dist/quasar/bloem').Bloem


describe('Bloem', function() {

  describe('destringify', function() {

    it('should return a Bloem from another Bloem', function () {
      var b = new Bloem(10, 10);
      Bloem.destringify(b).should.be.instanceOf(Bloem);
    });

  });

});