'use strict';

/**
 * `assign-owner` middleware.
 */

module.exports = (config, { strapi }) => {
  // Add your own logic here.
  return async (ctx, next) => {
    console.log('Assigning Owner...')
    console.log("Request: ", ctx.request)
    if (ctx.request.body.data) {
      console.log(ctx.request.body.data)
    }
    if (!ctx.request.body.data) {
      console.log('No data!')
      ctx.request.body.data = {};
    }
    console.log("UserId: ", ctx.state.user.id)
    
    console.log("Body Data: ", ctx.request.body.data)
    console.log('Assigning Owner...')
    ctx.request.body.data.user = ctx.state.user.id;
    console.log("Owner: " + ctx.request.body.data.user)
    console.log('Owner Assigned...')
    await next();
  };
};
