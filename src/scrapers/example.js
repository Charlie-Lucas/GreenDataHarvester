const cheerio = require('cheerio');

async function parseHTML(html) {
  const $ = cheerio.load(html);
  return $('title').text();
}

module.exports = { parseHTML };
