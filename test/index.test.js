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

    it('should fail to create a client when an invalid primary seed is provided', function () {
      return create({ seeds: () => Promise.resolve([ { _address: '127.0.0.1', _port: 6545 }]), port: 6545 }).then(() => {
        throw new Error();
      }, () => {
        return true
      });
    });

    it('should fail to create a client when an invalid secondary seed is provided', function () {
      return create({ seeds: () => Promise.resolve([
        { address: '127.0.0.1', port: 6545 },
        { _address: '127.0.0.1', _port: 6545 }
      ]), port: 6545 }).then(() => {
        throw new Error();
      }, () => {
        return true
      });
    });

    it('should create a client with a list of seeds', function () {
      return create({ seeds: () => Promise.resolve([
        { address: '127.0.0.1', port: 6545 },
        { address: '127.0.0.1', port: 6546 }
      ]), port: 6545 }).then(c => {
        c.should.be.instanceOf(Client);
        return c.disconnect();
      });
    });

    it('should update the seeds', function () {
      let seeds = () => Promise.resolve([
        { address: '127.0.0.1', port: 6545 },
        { address: '127.0.0.1', port: 6546 }
      ]);
      return create({ seeds, port: 6545 }).then(c => {
        c.should.be.instanceOf(Client);
        return c.updateSeeds();
      }).then(c => {
        return c.disconnect();
      });
    });
  });

  describe('five single-seed clients', function () {
    let clients;

    beforeEach(function() {
      return Promise.all([
        create({ seeds: () => Promise.resolve([ { address: '127.0.0.1', port: 6549 }]), port: 6545 }),
        create({ seeds: () => Promise.resolve([ { address: '127.0.0.1', port: 6545 }]), port: 6546 }),
        create({ seeds: () => Promise.resolve([ { address: '127.0.0.1', port: 6546 }]), port: 6547 }),
        create({ seeds: () => Promise.resolve([ { address: '127.0.0.1', port: 6547 }]), port: 6548 }),
        create({ seeds: () => Promise.resolve([ { address: '127.0.0.1', port: 6548 }]), port: 6549 })
      ]).then(_clients => {
        clients = _clients;
      });
    });

    afterEach(function() {
      for (let i of clients) i.disconnect();
      clients = undefined;
    });

    it('should create a chain of 5 clients and a message sent by the first should be received by the last', function() {
      return Promise.all([
        clients[0].node,
        clients[4].node,
      ]).then(([node1,node2]) => {
        var p = new Promise(resolve => {
          node1.on('test', resolve);
        });
        node2.send('test', { test: true });
        return p;
      });
    });

    it('should create a chain of 5 clients and two of them should receive a message', function() {
      return Promise.all([
        clients[0].node,
        clients[2].node,
        clients[4].node,
      ]).then(([node1,node2,node3]) => {
        var p = Promise.all([
          new Promise(resolve => {
            node1.addListener('test', resolve);
          }),
          new Promise(resolve => {
            node2.once('test', resolve);
          })
        ]);
        node3.send('test', { test: true });
        return p;
      });
    });

  });
});