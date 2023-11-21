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
            const cropHeight = metadata.height - 400; // Adjust cropping as needed
            return sharp(filePath)
              .extract({ left: 0, top: 150, width: metadata.width, height: cropHeight }) // Crop the image
              .toFile(finalFilePath);
          });

        // Create a read stream for the file
        const stream = fs.createReadStream(finalFilePath);

        // Upload the file to DigitalOcean Spaces
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

        // Associate the uploaded file with the recipe
        data.image = uploadedFile[0].id || null;

        // Cleanup: delete the local temp files
        fs.unlinkSync(filePath);
        fs.unlinkSync(finalFilePath);
      } catch (error) {
        console.error('Error downloading or processing image:', error);
      }
    }

  },
};
