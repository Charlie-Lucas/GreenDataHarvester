const { fetchInsee } = require('./client');
const { transformInsee } = require('./transform');

async function harvestInsee(endpoint, token) {
  const raw = await fetchInsee(endpoint, token);
  return transformInsee(raw);
}

module.exports = { harvestInsee };
