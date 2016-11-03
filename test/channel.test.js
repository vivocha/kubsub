const chai = require('chai')
  , should = chai.should()
  , Client = require('../dist/client').Client

describe('Channel', function() {

  describe('two nodes, two clients, two channels', function() {
    let c1, c2, chan1, chan2;

    beforeEach(function() {
      c1 = new Client({ seeds: () => Promise.resolve([ { address: '127.0.0.1', port: 6546 }]), port: 6545 });
      c2 = new Client({ seeds: () => Promise.resolve([ { address: '127.0.0.1', port: 6545 }]), port: 6546 });
      chan1 = c1.channel('test');
      chan2 = c2.channel('test');
      return Promise.all([
        new Promise(resolve => chan1.on('ready', resolve)),
        new Promise(resolve => chan2.on('ready', resolve))
      ]);
    });

    afterEach(function() {
      return c1.node.then(node => {
        return Promise.all([
          c1.disconnect(),
          c2.disconnect()
        ]).then(function() {
          c1 = c2 = chan1 = chan2 = null;
          should.not.exist(node.node);
        });
      });
    });

    it('should subscribe to a topic', function () {
      return chan1.node.then(node => {
        node.topics.has(chan1.channel).should.equal(true);
        node.listeners(chan1.channel).should.have.length(1);
      });
    });

    it('should not receive a message in the channel that sent it', function () {
      let msg = { test: true };
      return new Promise(function(resolve, reject) {
        chan1.on('data', data => {
          resolve();
        });
        chan2.on('data', data => {
          reject();
        });
        chan2.send(msg);
      });
    });

    it('should receive an untyped message', function () {
      let msg = { test: true };
      return new Promise(resolve => {
        chan1.on('data', data => {
          resolve(data);
        });
        c2.send('test', msg);
      }).then(data => {
        data.should.deep.equal(msg);
        should.exist(msg._id);
      });
    });

    it('should receive a typed message', function () {
      let msg = { type:'aaa', test: true };
      return new Promise(resolve => {
        chan1.on('aaa', data => {
          resolve(data);
        });
        c2.send('test', msg);
      }).then(data => {
        data.should.deep.equal(msg);
        should.exist(msg._id);
      });
    });

    it('should receive an empty message', function () {
      return new Promise(resolve => {
        chan1.on('data', data => {
          resolve(data);
        });
        c2.send('test');
      }).then(data => {
        should.exist(data);
        should.exist(data._id);
        data._id.should.be.a('string');
      });
    });

  });

  describe('one node, two clients, two channels', function() {
    let c1, c2, chan1, chan2;

    beforeEach(function() {
      c1 = new Client({ seeds: () => Promise.resolve([ { address: '127.0.0.1', port: 6545 }]), port: 6545 });
      c2 = new Client({ seeds: () => Promise.resolve([ { address: '127.0.0.1', port: 6545 }]), port: 6545 });
      chan1 = c1.channel('test');
      chan2 = c2.channel('test');
    });

    afterEach(function() {
      return c1.node.then(node => {
        return c1.disconnect().then(function () {
          return c2.node.then(node => {
            return c2.disconnect().then(function () {
              c1 = c2 = chan1 = chan2 = null;
              should.not.exist(node.node);
            });
          });
        });
      });
    });

    it('should emit "ready" when connected', function () {
      const ready = chai.spy();
      return Promise.all([
        new Promise(resolve => chan1.on('ready', resolve)),
        new Promise(resolve => chan2.on('ready', resolve))
      ]);
    });

    it('should subscribe to a topic', function () {
      return chan1.node.then(node => {
        node.topics.has(chan1.channel).should.equal(true);
        node.listeners(chan1.channel).should.have.length(2);
      });
    });

    it('should not receive a message in the channel that sent it', function () {
      let msg = { test: true };
      return new Promise(function(resolve, reject) {
        chan1.on('data', data => {
          resolve();
        });
        chan2.on('data', data => {
          reject();
        });
        chan2.send(msg);
      });
    });

    it('should receive an untyped message', function () {
      let msg = { test: true };
      return new Promise(resolve => {
        chan1.on('data', data => {
          resolve(data);
        });
        c1.send('test', msg);
      }).then(data => {
        data.should.deep.equal(msg);
        should.exist(msg._id);
      });
    });

    it('should receive a typed message', function () {
      let msg = { type:'aaa', test: true };
      return new Promise(resolve => {
        chan1.on('aaa', data => {
          resolve(data);
        });
        c1.send('test', msg);
      }).then(data => {
        data.should.deep.equal(msg);
        should.exist(msg._id);
      });
    });

  });
});