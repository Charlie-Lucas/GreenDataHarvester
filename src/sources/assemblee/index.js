const { fetchAssemblee } = require('./client');
const { transformAssemblee } = require('./transform');

async function harvestAssemblee(endpoint) {
  const raw = await fetchAssemblee(endpoint);
  return transformAssemblee(raw);
}

module.exports = { harvestAssemblee };
