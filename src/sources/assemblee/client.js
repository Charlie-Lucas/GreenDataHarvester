const axios = require('axios');

async function fetchAssemblee(endpoint) {
  const response = await axios.get(endpoint);
  return response.data;
}

module.exports = { fetchAssemblee };
