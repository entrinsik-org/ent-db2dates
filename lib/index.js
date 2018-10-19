'use strict';

const moment = require('moment');
const _ = require('lodash');
const Logger = require('glib').Logger;
const logger = new Logger('informer-db2dates');

const converter = function(type, value) {
    logger.debug("convert");
    logger.debug(`Type: ${type}, Value: ${value}`);
    if(_.isNumber(value) && _.isObject(value)) {
        //value needs to be the primitive then
        value = value.valueOf();
    }
    if (type === 'date' && !value) return null;
    return (type === 'date' && _.isNumber(value)) ? moment(value, 'YYYYMMDD').toDate() : value;
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

exports.register.attributes = { name: 'ent-db2dates' };
