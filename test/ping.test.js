const { expect } = require('chai');
const resolvers = require('../graphql/resolvers');

describe('GraphQL resolvers', () => {
  it('returns pong for ping', () => {
    expect(resolvers.Query.ping()).to.equal('pong');
  });
});
