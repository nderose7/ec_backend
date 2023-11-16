// utils/imageDownloader.js
const axios = require('axios');
const fs = require('fs');
const path = require('path');

async function downloadImage(url, filePath) {
  const response = await axios({
    url,
    responseType: 'stream',
  });

  return new Promise((resolve, reject) => {
    response.data.pipe(fs.createWriteStream(filePath))
      .on('finish', () => resolve(filePath))
      .on('error', e => reject(e));
  });
}

module.exports = downloadImage;
