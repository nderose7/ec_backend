module.exports = {
  '0 * * * *': async () => {  // This will run every hour
      console.log("Attempting cron...");
      console.log("Available services:", Object.keys(strapi.services));

      try {
        await strapi.services['api::recipe.recipe-check-image'].checkAndGenerateImages();
          console.log('Image check and update completed.');
      } catch (err) {
          console.error('Image check and update failed:', err);
      }
  },
};
