// Path: src/api/recipe/content-types/recipe/lifecycles.js

const { errors } = require('@strapi/utils');
const { ApplicationError } = errors;
const downloadImage = require('../../../../utils/imageDownloader'); 
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const fs = require('fs');
const sharp = require('sharp'); 

module.exports = {
  async beforeCreate(event) {
    const { data, where, select, populate } = event.params;
    const { recipe_name, image_url } = data; 

    let proposedUID;

    if (recipe_name) {
      console.log("Title found...")
      // First, remove apostrophes, then replace non-alphanumeric characters with hyphens
      proposedUID = recipe_name.toLowerCase()
                      .replace(/'/g, '') // Removes apostrophes
                      .replace(/[^a-z0-9]/g, '-') // Replaces non-alphanumeric characters with hyphens
                      .replace(/--+/g, '-').trim(); // Replaces multiple hyphens with a single hyphen
      console.log("Proposed uid: ", proposedUID)

      // Check for an existing recipe with the same UID
      const existingRecipeCount = await strapi.entityService.count('api::recipe.recipe', {
        filters: { uid: proposedUID },
      });

      if (existingRecipeCount > 0) {
        throw new ApplicationError("Recipe exists in strapi, skipping create...")
      }

      // If no duplicate is found, assign the UID to the new recipe if not already set
      if (!data.uid) {
        console.log("No dupe found, creating new uid")
        data.uid = proposedUID;
      }
    }

    if (image_url) {
      try {
        const tempFileName = `${data.uid || proposedUID}-temp.png`; // Temporary file name for the downloaded PNG
        const finalFileName = `${data.uid || proposedUID}.jpg`; // Final file name for the JPEG
        const filePath = path.join(__dirname, '../../../../../public/uploads/images', tempFileName);
        const finalFilePath = path.join(__dirname, '../../../../../public/uploads/images', finalFileName);

        await downloadImage(image_url, filePath);

        // Convert PNG to JPEG, optimize, and then crop
        await sharp(filePath)
          .jpeg({ quality: 10 }) // Adjust quality as needed
          .metadata()
          .then(metadata => {
            const cropHeight = metadata.height - 400; // Reduce height by 300px (150px off top and bottom)
            return sharp(filePath)
              .extract({ left: 0, top: 150, width: metadata.width, height: cropHeight }) // Crop the image
              .toFile(finalFilePath);
          });

        // Use sharp to get image metadata from the converted and cropped file
        const metadata = await sharp(finalFilePath).metadata();

        const fileData = {
          path: finalFilePath,
          name: finalFileName,
          mime: 'image/jpeg',
          size: fs.statSync(finalFilePath).size,
          width: metadata.width,
          height: metadata.height,
          url: `/uploads/images/${finalFileName}`,
          previewUrl: `/uploads/images/${finalFileName}`,
        };
        const file = await strapi.plugins['upload'].services.upload.add(fileData);

        // Associate the file with the recipe
        data.image = file.id;

        // Optionally delete the original downloaded PNG file
        fs.unlinkSync(filePath);
      } catch (error) {
        console.error('Error downloading or processing image:', error);
      }
    }

  },
};
