'use strict';

const moment = require('moment');
const _ = require('lodash');
const es = require('ent-streams');

const converter = function(type, value) {
    if (type === 'date' && !value) return null;
    return (type === 'date' && _.isNumber(value)) ? moment(value, 'YYYYMMDD').toDate() : value;
};

exports.register = function (server, opts, next) {
    const dataTypes = server.dm('dataType');
    dataTypes.intercept({
        parse: (type, rawType, value, next) => {
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
