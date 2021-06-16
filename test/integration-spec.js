'use strict';
const { expect } = require('chai');
const pg = require('pg');
const _ = require('lodash');
const moment = require('moment');
const database = 'db2dates_test';

/*
    Run this from i5 project, setting mocha options to use a config.json that loads the db2-dates plugin
    environment variables:
        informer.home={i5 project} (/Users/andrewmorovati/IdeaProjects/i5)
    Mocha package:
        mocha package within plugin project (~/git/ent-db2dates/node_modules/mocha)
 */
const { start, injector, setup, teardown } = require(`${process.env['informer.home']}/unit/lib/server`);

const pgQuery = async (connection, sql) => {
    const client = await pg.connect(connection);
    await client.query(sql);
    await client.end();
}

const newPayloadField = (column, dataType) => ({
    type:'field',
    mappingId: 'test',
    schemaId: 'public',
    path: column,
    fieldId: column,
    id: column,
    label: column,
    dataType
});


const newField = (datasourceId, column, dataType, position) => ({
    name: column,
    label: column,
    format:{},
    fieldId: `${datasourceId}:public+test:${column}`,
    dataType,
    position
});

const newQueryRequest = (datasourceId, name) => ({
    url: '/api/queries',
    method: 'post',
    payload: {
        name,
        language: 'informer',
        datasourceId,
        payload: {
            fields: [
                newPayloadField('product', 'keyword_text'),
                newPayloadField('edate', 'date')
            ],
            source: {
                id: datasourceId+':public+test',
                schemaId:'public',
                mappingId: 'test'
            }
        },
        fields: {
            product: newField(datasourceId,'product','keyword_text',1),
            edate: newField(datasourceId,'edate','date',2)
        },
        linkRefs: []
    },
});

describe('The DB2 dates plugin', function () {
    let server, tenant, asAdmin, testDatasourceConfig, datasourceId;
    before(start(s => server = s));
    before(setup('northwind', async t => {
        tenant = t;
        asAdmin = injector(t);
    }));
    // write out tables
    before(async () => {
        testDatasourceConfig = _.assign({} , server.app.config.db, { database: database})
        await pgQuery(server.app.config.db, `DROP DATABASE IF EXISTS "${database}";`);
        await pgQuery(server.app.config.db, `CREATE DATABASE "${database}"`);
        await pgQuery(testDatasourceConfig, `CREATE TABLE test("product" text,"edate" int);`);
        await pgQuery(testDatasourceConfig, `
            INSERT INTO test VALUES
                ('washer',20201123),
                ('dryer',20201122),
                ('color TV',20210325);
        `);
    });

    before(async () => {
        let res;
        //create datasource
        const payload = {
            type: 'postgres',
            connection: testDatasourceConfig,
            schemas: ['public'],
            name: 'db2dates'
        };
        res = await asAdmin({
            url: '/api/datasources',
            method: 'post',
            payload
        });
        expect(res.statusCode).to.equal(201);
        datasourceId = res.result.id;
        //scan the datasource
        res = await asAdmin({
           url: '/api/datasources/admin:db2dates/_scan',
           method: 'post',
           payload: {
               options: {
                   strategy: 'full'
               }
           }
        });
        expect(res.statusCode).to.equal(200);
        expect(res.result.mappings).to.equal(1);
        expect(res.result.fields).to.equal(2);
        res = await asAdmin({
           url: '/api/datasources/admin:db2dates/mappings/public+test/fields/edate',
           method: 'put',
           payload: {
               dataType: 'date'
           }
        });
        expect(res.statusCode).to.equal(200);
    });

    after(async () => teardown(tenant));

    it('should treat numerically represented date fields like dates', async () => {
        let res;
        res = await asAdmin(newQueryRequest(datasourceId, 'test1'));
        expect(res.statusCode).to.equal(200);
        res = await asAdmin({
            url: '/api/queries/admin:test1/_execute?limit=-1',
            method: 'post'
        });
        const result = JSON.parse(res.result);
        expect(result.length).to.equal(3);
        const dates = _.map(result, e => moment(e.edate).format('MM/DD/YYYY'));
        expect(dates).to.eql(['11/23/2020', '11/22/2020', '03/25/2021']);
    });

    it('should convert date criteria values to numeric', async () => {
        let res;
        const req = newQueryRequest(datasourceId,'test2');
        req.payload.payload.criteria = {
            type: 'group',
            negated: false,
            children: [
                {
                    type: 'leaf',
                    expression: {
                        comparisonPredicate: {
                            operator: {
                                id: 'IS_ON',
                                comparison: '='
                            },
                            lhsExpression: {
                                id: 'edate',
                                path: 'edate',
                                type: 'field',
                                fieldId: 'edate',
                                label: 'Edate',
                                linkRef: '',
                                rawType: 'integer',
                                dataType: 'date',
                                schemaId: 'public',
                                mappingId: 'test',
                                mappingPath: datasourceId + ':public+test'
                            },
                            rhsExpression: {
                                type: 'valueList',
                                value: [
                                    moment('03/25/2021').toISOString()
                                ],
                                rawType: 'integer',
                                dataType: 'date'
                            }
                        }
                    }
                }
            ],
            junction: 'and'
        };
        res = await asAdmin(req);
        expect(res.statusCode).to.equal(200);
        res = await asAdmin({
            url: '/api/queries/admin:test2/_execute?limit=-1',
            method: 'post'
        });
        const result = JSON.parse(res.result);
        expect(result.length).to.equal(1);
        const dates = _.map(result, e => moment(e.edate).format('MM/DD/YYYY'));
        expect(dates).to.eql(['03/25/2021']);
    });

});
