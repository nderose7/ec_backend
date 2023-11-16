const { checkAndGenerateImages } = require('../src/utils/recipeCheckImage');

module.exports = {
    '0 * * * *': () => {  // This will run every hour
        console.log("Attempting cron...")
        checkAndGenerateImages()
            .then(() => console.log('Image check and update completed.'))
            .catch(err => console.error('Image check and update failed:', err));
    },
};
