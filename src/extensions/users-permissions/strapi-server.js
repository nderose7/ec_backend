console.log("Strapi update me plugin activating...")

module.exports = (plugin) => {
  // Ensure that the 'user' controller is available in the plugin
  if (!plugin.controllers.user) {
    console.log("User controller is available in plugin...")
    plugin.controllers.user = {};
  }

  plugin.controllers.user.updateMe = async (ctx) => {
    try {
      console.log("Seeing if user...");
      if (!ctx.state.user || !ctx.state.user.id) {
        ctx.throw(401, 'Unauthorized: User not found.');
      }
      console.log("Updating user plugin with id...", ctx.state.user.id);
      console.log("Body: ", ctx.request.body);
      await strapi.entityService.update('plugin::users-permissions.user', ctx.state.user.id, {
        data: ctx.request.body
      });
      console.log("Update complete.");
      ctx.body = { message: 'Update successful' };
    } catch (error) {
      ctx.throw(500, `Internal server error: ${error.message}`);
    }
  };

  // Custom route configuration
  plugin.routes["content-api"].routes.push({
    method: "PUT",
    path: "/users/me", // Ensure the path is correctly specified
    handler: "user.updateMe",
    config: {
      prefix: "",
      policies: [],
      auth: false // Set to true if authentication is required
    }
  });

  return plugin;
};
