'use strict';

var should = require('chai').should();
var lib = require('../');
var Moment = require('Moment');
var idFunction = v => v;


describe('The db2dates data type interceptor', function () {

    before(function() {
        var self = this;
        //this is called to get us access to the plugin
        var srvr = {
            dm: function() {
                return  {
                    intercept: function(plugin) {self.plugin = plugin}
                };
            }
        };
        lib.register(srvr, null, () => {});
    });
    it('should exist', function () {
        should.exist(lib);
    });
    it('should parse a date correctly and return a number', function() {
        var numericValue = this.plugin.parse('date','date',new Moment('2017-02-02').toDate(), idFunction);
        numericValue.should.equal(20170202);
    });
    it('should convert a date value correctly and return a date', function() {
        this.plugin.convert('date',20101102,idFunction).getTime().should.equal(new Moment('2010-11-02').toDate().getTime());
    });
    it('should not attempt to convert a null number', function() {
        var converted = this.plugin.convert('date',null,idFunction);
        (converted === null).should.be.true;
    })
    it('should return null when converting zero', function() {
        var converted = this.plugin.convert('date',0,idFunction);
        (converted === null).should.be.true;
    })
});