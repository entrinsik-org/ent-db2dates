'use strict';

const moment = require('moment');
const _ = require('lodash');
const joi = require('joi');

/**
 * You can add an array of tenants that this plugin applies to.
 *"@entrinsik/informer-db2dates" : {
 *     "tenants" : [
 *       "sage",
 *       "exxon"
 *    ]
 *  }
 * @type {{tenants: *}}
 */
const schema = {
    tenants: joi.array().items(joi.string()).optional()
};

const converter = function(type, value) {
    if(type === 'date') {
        //it isn't null
        if (!value) return null;
        //if it is a Date return it
        if(value instanceof Date) return value;
        //if it's a Number object, turn to primitive
        if(value instanceof Number) {
            value = value.valueOf();
            if(!value) return null;
        }
        //return the parsed date
        return moment(value, 'YYYYMMDD').toDate()
    }
    return value;
};

const doConversion = (server,opts) => !(_.get(opts,'tenants')) || (opts.tenants.indexOf(server.activeRequest().tenant()) > -1);

exports.register = function (server, opts, next) {
    opts = opts || {};
    joi.validate(opts, schema, function (err, validated) {
        if (err) throw new Error('For @entrinsik/informer-db2dates, "tenants" option must be an array of tenant ids.');
        opts = validated;
    });
    const dataTypes = server.dm('dataType');
    dataTypes.intercept({
        parse: (type, rawType, value, next) => {
            if (type === 'date' && doConversion(server,opts)) return parseInt(moment(value).format('YYYYMMDD'));
            return next();
        },
        convert: (type, value, next) => {
            if(type === 'date' && doConversion(server,opts)) {
                if(_.isArray(value)) {
                    return _.map(value, v => converter(type, v));
                }
                return converter(type, value);
            }
            return next();
        }
    });

    next();
};

exports.converter = converter;

exports.register.attributes = { name: 'ent-db2dates' };
