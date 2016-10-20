const chai = require('chai')
  , spies = require('chai-spies')
  , should = chai.should()
  , Client = require('../dist/client').Client

chai.use(spies);

describe('Client', function() {

  describe('constructor', function () {
    let c;

    afterEach(function() {
      return c.disconnect().catch(err => {});
    });

    it('should set the default namespace when invoked without one', function () {
      c = new Client({
        seeds() {
          return Promise.resolve([]);
        }
      });
      c.connect().catch(err => {});
      c.should.be.instanceOf(Client);
      c.namespace.should.equal('kubsub');
    });

    it('should call the seedRetriever', function () {
      const retriever = chai.spy(function() { return Promise.resolve([])});
      const thenF = chai.spy();
      const catchF = chai.spy();
      c = new Client({
        seeds : retriever
      });
      return c.connect().then(thenF, catchF).then(function() {
        retriever.should.have.been.called();
        thenF.should.not.have.been.called();
        catchF.should.have.been.called();
      });
    });
  });

});