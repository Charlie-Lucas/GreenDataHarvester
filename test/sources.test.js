const { expect } = require('chai');
const nock = require('nock');

describe('source connectors', () => {
  beforeEach(() => {
    delete process.env.http_proxy;
    delete process.env.HTTP_PROXY;
    delete process.env.https_proxy;
    delete process.env.HTTPS_PROXY;
  });

  afterEach(() => {
    nock.cleanAll();
    delete require.cache[require.resolve('../src/sources')];
  });

  it('harvests data from configured sources', async () => {
    nock('http://example.com').get('/assemblee').reply(200, { value: 'assemblee-data' });
    nock('http://example.com')
      .get('/insee')
      .matchHeader('Authorization', 'Bearer token')
      .reply(200, { value: 'insee-data' });

    const { harvestAll } = require('../src/sources');

    const data = await harvestAll();
    expect(data).to.deep.equal({
      assemblee: { value: 'assemblee-data' },
      insee: { value: 'insee-data' }
    });
  });
});
