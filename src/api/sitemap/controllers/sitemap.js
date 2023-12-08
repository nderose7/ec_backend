// sitemap.js
module.exports = {
  async index(ctx) {
    try {
      let fetchMore = true;
      let start = 0;
      let limit = 25; 
      let recipes = [];

      while (fetchMore) {
        const fetchedRecipes = await strapi.entityService.findMany('api::recipe.recipe', {
          start: start,
          limit: limit,
          populate: "image",
        });

        if (fetchedRecipes.length === 0) {
          fetchMore = false;
        } else {
          recipes = recipes.concat(fetchedRecipes);
          start += limit;
        }
      }

      console.log(recipes[0].image.url)

      // Start the XML string
      let xml = '<?xml version="1.0" encoding="UTF-8"?>';
      xml += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" ';
      xml += 'xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">';


      recipes.forEach(recipe => {
        const updatedAt = new Date(recipe.updatedAt);
        xml += `<url>`;
        xml += `<loc>https://www.eatclassy.com/recipes/${recipe.uid}</loc>`;
        if (recipe.image && recipe.image.url) { // Check if image and image.url exist
          xml += `<image:image><image:loc>${recipe.image.url}</image:loc></image:image>`;
        }
        xml += `<lastmod>${updatedAt.toISOString()}</lastmod>`;
        xml += `</url>`;
      });

      // Close the urlset tag
      xml += '</urlset>';

      // Set the content type and return the XML
      ctx.set('Content-Type', 'application/xml');
      ctx.body = xml;
    } catch (error) {
      console.error('Error generating sitemap:', error);
      ctx.body = error;
    }
  }
};
