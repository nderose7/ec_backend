const OpenAI = require("openai");
const path = require('path');
const fs = require('fs');
const sharp = require('sharp');
const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
const downloadImage = require('../utils/imageDownloader'); // Ensure this path is correct


async function checkAndGenerateImages() {
  console.log("Checking recipes for images...")
  try {
    const recipes = await strapi.entityService.findMany('api::recipe.recipe', {
      populate: "image",
    });
    //console.log("Recipes: ", recipes)
    for (const recipe of recipes) {
      if (!recipe.image) {
        //console.log("Recipe: ", recipe)
        
        console.log("Recipe w/out image found...")
        const recipeName = `Image of ${recipe.recipe_name}`;
        const generatedImage = await generateImageWithDALLE(recipeName, recipe.uid);

        if (generatedImage) {
          const updatedRecipe = await strapi.entityService.update('api::recipe.recipe', recipe.id, {
            data: {
              image: generatedImage.id,  // Associate the image ID with the recipe
            },
          });
        }
      }
    }
  } catch (error) {
    console.error('Error in checkAndGenerateImages:', error);
  }
}

async function generateImageWithDALLE(recipeName, recipeUID) {
  const prompt_for_image = `Create a highly detailed and realistic image of ${recipeName}. The image should vividly depict the dish's colors, textures, and key ingredients. Include visual elements like garnishes, the type of plate or bowl it's served in, and any side items or accompaniments that are typically served with it. The goal is to make the image as appetizing and true-to-life as possible, capturing the essence of the dish's flavors and presentation.`
  console.log("Trying prompt for: ", recipeName)
  const response = await client.images.generate({
    model: "dall-e-3",
    prompt: prompt_for_image,
    n: 1,
    size: "1024x1024"
  });

  const image_url = response.data[0].url;
  if (image_url) {
    try {
      const tempFileName = `${recipeUID}-temp.png`;
      const finalFileName = `${recipeUID}.jpg`;
      const filePath = path.join(__dirname, '../../public/uploads/images', tempFileName);
      const finalFilePath = path.join(__dirname, '../../public/uploads/images', finalFileName);

      await downloadImage(image_url, filePath);

      await sharp(filePath)
        .jpeg({ quality: 10 })
        .metadata()
        .then(metadata => {
          const cropHeight = metadata.height - 400;
          return sharp(filePath)
            .extract({ left: 0, top: 150, width: metadata.width, height: cropHeight })
            .toFile(finalFilePath);
        });

      // Upload the file to DigitalOcean Spaces
      const stream = fs.createReadStream(finalFilePath);
      const fileData = {
        path: stream, // The file stream
        name: finalFileName,
        type: 'image/jpeg',
        size: fs.statSync(finalFilePath).size,
      };

      const uploadedFile = await strapi.plugins.upload.services.upload.upload({
        data: {}, // Any additional data you want to store
        files: fileData, // File data for upload
      });

      fs.unlinkSync(filePath); // Delete the local temp file
      fs.unlinkSync(finalFilePath); // Delete the final local file

      return uploadedFile[0] || null; // Adjust based on the returned structure
    } catch (error) {
      console.error('Error downloading or processing image:', error);
      return null;
    }
  }
  return null;
}

module.exports = {
  checkAndGenerateImages,
};
