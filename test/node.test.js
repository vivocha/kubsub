const chai = require('chai')
  , spies = require('chai-spies')
  , should = chai.should()
  , Node = require('../dist/node').Node

chai.use(spies);

describe('Node', function() {

  describe('constructor', function () {
    let n;

    afterEach(function() {
      n.dispose();
    });

    it('should set the default values when invoked without options', function () {
      n = new Node({
        seeds() {
          return Promise.resolve([]);
        }
      });
      n.ready.catch(err => {});
      n.should.be.instanceOf(Node);
      n.address.should.equal(Node.DEFAULT_ADDRESS);
      n.port.should.equal(Node.DEFAULT_PORT);
      n.refresh.should.equal(0);
    });

    it('should override the defaults when invoked with a complete option object', function () {
      n = new Node({
        address: 'aaa',
        port: 1234,
        refresh: 1,
        seeds() {
          return Promise.resolve([]);
        }
      });
      n.ready.catch(err => {});
      n.should.be.instanceOf(Node);
      n.address.should.equal('aaa');
      n.port.should.equal(1234);
      n.refresh.should.equal(1);
    });

    it('should override some defaults when invoked with a partial option object', function () {
      n = new Node({
        address: 'aaa',
        refresh: 1,
        seeds() {
          return Promise.resolve([]);
        }
      });
      n.ready.catch(err => {});
      n.should.be.instanceOf(Node);
      n.address.should.equal('aaa');
      n.port.should.equal(Node.DEFAULT_PORT);
      n.refresh.should.equal(1);
    });

    it('should call the seedRetriever', function () {
      const retriever = chai.spy(function() { return Promise.resolve([])});
      const thenF = chai.spy();
      const catchF = chai.spy();
      n = new Node({
        seeds : retriever
      });
      return n.ready.then(thenF, catchF).then(function() {
        retriever.should.have.been.called();
        thenF.should.not.have.been.called();
        catchF.should.have.been.called();
      });
    });

  });

  describe('two clients', function() {
    let n1, n2;

    beforeEach(function() {
      n1 = new Node({ seeds: () => Promise.resolve([ { address: '127.0.0.1', port: 6546 } ]), port: 6545 });
      n2 = new Node({ seeds: () => Promise.resolve([ { address: '127.0.0.1', port: 6545 } ]), port: 6546 });
    });

    afterEach(function() {
      n1.dispose();
      n2.dispose();
      n1 = n2 = null;
    });

    it('should resolve "ready" when connected', function () {
      const ready = chai.spy();
      return Promise.all([
        n1.ready.then(ready),
        n2.ready.then(ready)
      ]).then(() => {
        ready.should.have.been.called.twice();
      });
    });

    it('should receive each other\'s messages', function () {
      const ready = chai.spy();
      return Promise.all([
        n1.ready.then(ready),
        n2.ready.then(ready)
      ]).then(() => {
        const msg = { test: true };
        return new Promise(resolve => {
          n2.on('test', recv => {
            resolve(recv);
          });
          n1.send('test', msg);
        }).then(recv => {
          recv.should.deep.equal(msg);
        });
      });
    });

    it('should receive own sent messages', function () {
      const ready = chai.spy();
      return Promise.all([
        n1.ready.then(ready),
        n2.ready.then(ready)
      ]).then(() => {
        const msg = { test: true };
        return new Promise(resolve => {
          n1.on('test', recv => {
            resolve(recv);
          });
          n1.send('test', msg);
        }).then(recv => {
          recv.should.deep.equal(msg);
        });
      });
    });

  });

});