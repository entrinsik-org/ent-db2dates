'use strict';

const moment = require('moment');
const _ = require('lodash');
const Logger = require('glib').Logger;
const logger = new Logger('informer-db2dates');

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
        return moment(value).toDate()
    }
    return value;
};

exports.register = function (server, opts, next) {
    const dataTypes = server.dm('dataType');
    dataTypes.intercept({
        parse: (type, rawType, value, next) => {
            logger.debug("parse");
            logger.debug(`Type: ${type}, RawType: ${rawType}, Value: ${value}`);
            if (type === 'date') return parseInt(moment(value).format('YYYYMMDD'));

            return next();
        },
        convert: (type, value, next) => {
            if(type === 'date') {
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
