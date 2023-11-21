const axios = require('axios');
const fs = require('fs');
const path = require('path');

async function downloadImage(url, filePath) {
  try {
    const response = await axios({
      url,
      responseType: 'stream',
    });

    if (response.status !== 200) {
      throw new Error(`Failed to download image: status code ${response.status}`);
    }

    // Ensure directory exists
    const directory = path.dirname(filePath);
    if (!fs.existsSync(directory)) {
      fs.mkdirSync(directory, { recursive: true });
    }

    return new Promise((resolve, reject) => {
      response.data.pipe(fs.createWriteStream(filePath))
        .on('finish', () => resolve(filePath))
        .on('error', e => reject(e));
    });
  } catch (error) {
    console.error('Error downloading image:', error.message);
    throw error; // Rethrow the error for handling in the caller
  }
}

module.exports = downloadImage;
