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

    //apply this conversion to the columns directly after query
    server.app.ext('datasource.beforeQuery', (d, q) => {
        const dateFields = _.reduce(q.payload.fields, (accu, v) => v.dataType === 'date' ? accu.concat(v.fieldId) : accu, []);
        q.through(es.eachSync(r => {
            _.forEach(dateFields, f => {
                r[f] = dataTypes.convert('date', r[f], () => {
                    r[f]
                });
            });
            return r;
        }))
    });
    next();
};

exports.register.attributes = { name: 'ent-db2dates' };
