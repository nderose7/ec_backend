module.exports = (plugin) => {

  plugin.controllers.user.updateMe = async (ctx) => {
    try {
      console.log("Seeing if user...")
      if (!ctx.state.user || !ctx.state.user.id) {
        ctx.throw(401, 'Unauthorized: User not found.');
      }
      console.log("Updating user plugin with id...", ctx.state.user.id)
      console.log("Body: ", ctx.request.body)
      await strapi.entityService.update('plugin::users-permissions.user', ctx.state.user.id, {
        data: ctx.request.body
      });
      console.log("Update complete.")
      ctx.body = { message: 'Update successful' };
    } catch (error) {
      ctx.throw(500, `Internal server error: ${error.message}`);
    }
  }
  // custom route (remains unchanged)
  plugin.routes["content-api"].routes.push(
    {
      method: "PUT",
      path: "/user/me",                         
      handler: "user.updateMe",
      config: {
        prefix: "",
        policies: []
      }
    })
    
  return plugin;
}
