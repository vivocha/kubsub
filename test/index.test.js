const chai = require('chai')
  , spies = require('chai-spies')
  , should = chai.should()
  , Client = require('../dist/client').Client
  , create = require('../dist/index').create

chai.use(spies);

describe('kubsub', function() {

  describe('create', function () {

    it('should fail to create a client when no seeds are provided', function () {
      return create({ seeds: () => Promise.resolve([]) }).catch(err => {
        err.should.instanceOf(Error);
        err.message.should.equal('no_seed');
      });
    });

    it('should create a client', function () {
      return create({ seeds: () => Promise.resolve([ { address: '127.0.0.1', port: 6545 }]), port: 6545 }).then(c => {
        c.should.be.instanceOf(Client);
        return c.disconnect();
      });
    });

  });

});