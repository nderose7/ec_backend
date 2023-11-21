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
      let tempFilePath, finalFilePath;
      try {
        console.log("Image url found...")
        const tempFileName = `${data.uid || proposedUID}-temp.png`;
        const finalFileName = `${data.uid || proposedUID}.jpg`;
        tempFilePath = path.join(__dirname, '../../../../../public/uploads/images', tempFileName);
        finalFilePath = path.join(__dirname, '../../../../../public/uploads/images', finalFileName);

        console.log("image_url, path: ", image_url, tempFilePath)
        await downloadImage(image_url, tempFilePath);

        console.log("Running sharp")
        await sharp(tempFilePath)
          .jpeg({ quality: 10 })
          .metadata()
          .then(metadata => {
            const cropHeight = metadata.height - 400;
            return sharp(tempFilePath)
              .extract({ left: 0, top: 150, width: metadata.width, height: cropHeight })
              .toFile(finalFilePath);
          });

        if (fs.existsSync(finalFilePath) && fs.statSync(finalFilePath).size > 0) {
          console.log("FinalFileName: ", finalFileName)
          // Read the file into a buffer for upload
          const buffer = fs.readFileSync(finalFilePath);
          const fileData = {
            path: buffer, // Pass buffer instead of stream
            name: finalFileName,
            type: 'image/jpeg',
            size: buffer.length,
          };

          const uploadedFile = await strapi.plugins.upload.services.upload.upload({
            data: {}, // Any additional data you want to store
            files: {
              path: finalFilePath, // Pass the file path instead of the buffer
              name: finalFileName,
              type: 'image/jpeg',
            },
          });

          // Associate the uploaded file with the recipe
          data.image = uploadedFile[0].id || null;
        } else {
          throw new Error(`Processed file not found or empty: ${finalFilePath}`);
        }

      } catch (error) {
          console.error('Error downloading or processing image:', error);
          // Handle specific error scenarios here
      } finally {
          // Cleanup: delete the local temp files if they exist
          if (fs.existsSync(tempFilePath)) {
            fs.unlinkSync(tempFilePath);
          }
          if (fs.existsSync(finalFilePath)) {
            fs.unlinkSync(finalFilePath);
          }
      }
    }


  },
};
