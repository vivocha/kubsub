const chai = require('chai')
  , should = chai.should()
  , kad = require('kad')
  , QuasarNode = require('../../dist/quasar/node').QuasarNode


describe('QuasarNode', function() {

  describe('constructor', function() {
    let n;

    afterEach(function() {
      if (n) n.disconnect();
    });

    it('should throw if not transport info is specified', function () {
      (function() { new QuasarNode() }).should.throw(Error, "either transport or address and port must be specified");
    });

    it('should create a node using the specified storage, transport and router', function() {
      let logger = { info: function() {}, debug: function() {} }
      let contact = new kad.contacts.AddressPortContact({ address: '0.0.0.0', port: 9999 });
      let transport = new kad.transports.UDP(contact, { logger: logger });
      var opts = {
        storage: new kad.storage.MemStore(),
        logger: logger,
        transport: transport,
        router: new kad.Router({
          transport: transport
        })
      };
      n = new QuasarNode(opts);
      n.router.should.equal(opts.router);
    });
  });

});