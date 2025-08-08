const axios = require('axios');

async function fetchInsee(endpoint, token) {
  const response = await axios.get(endpoint, {
    headers: { Authorization: `Bearer ${token}` }
  });
  return response.data;
}

module.exports = { fetchInsee };
