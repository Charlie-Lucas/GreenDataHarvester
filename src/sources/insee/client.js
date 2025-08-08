const axios = require('axios');

async function fetchInsee(endpoint, token) {
  const response = await axios.get(endpoint, {
    headers: { Authorization: `Bearer ${token}` },
    proxy: false
  });
  return response.data;
}

module.exports = { fetchInsee };
