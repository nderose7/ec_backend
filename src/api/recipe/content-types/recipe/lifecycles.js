// Path: src/api/recipe/content-types/recipe/lifecycles.js

const { errors } = require('@strapi/utils');
const { ApplicationError } = errors;

module.exports = {
  async beforeCreate(event) {
    const { data, where, select, populate } = event.params;
    const { recipe_name } = data;

    if (recipe_name) {
      console.log("Title found...")
      const proposedUID = recipe_name.toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/--+/g, '-').trim();
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
  },
};
