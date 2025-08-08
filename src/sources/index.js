const sources = require('../../config/sources.json');
const { harvestAssemblee } = require('./assemblee');
const { harvestInsee } = require('./insee');

const connectors = {
  assemblee: harvestAssemblee,
  insee: harvestInsee
};

async function harvestAll() {
  const results = {};
  for (const source of sources) {
    const connector = connectors[source.connector];
    if (!connector) {
      throw new Error(`Unknown connector: ${source.connector}`);
    }
    results[source.name] = await connector(source.endpoint, source.token);
  }
  return results;
}

module.exports = { harvestAll };
