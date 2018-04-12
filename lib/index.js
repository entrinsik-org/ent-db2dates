'use strict';

const moment = require('moment');
const _ = require('lodash');

exports.register = function (server, opts, next) {
    server.dm('dataType').intercept({
        parse: (type, rawType, value, next) => {
            if (type === 'date') return parseInt(moment(value).format('YYYYMMDD'));

            return next();
        },
        convert: (type, value, next) => {
            if (type === 'date' && !value) return null;
            if (type === 'date' && _.isNumber(value)) return moment(value, 'YYYYMMDD').toDate();
            return next();
        }
    });
    next();
};

exports.register.attributes = { name: 'ent-db2dates' };
