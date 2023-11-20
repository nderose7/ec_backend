'use strict';

/**
 *  userdata controller
 */

const { createCoreController } = require('@strapi/strapi').factories;

module.exports = createCoreController('api::userdata.userdata',
({
  strapi
}) => ({
  async find(ctx) {
    //console.log("Attempting find userdata for user ", ctx.state.user)
    //console.log("ctx.query: ", ctx.query)
    const {
      filters
    } = ctx.query
    ctx.query = {
      ...ctx.query,
      populate: {
        recipes: {
          populate: "*"
        },
        avatar: "*",
      },
      filters: {
        ...filters,
        owner: {
          id: ctx.state.user.id
        }
      }
    }
    return await super.find(ctx);
  },
  async findOne(ctx) {
    const {
      filters
    } = ctx.query;
    const {
      id
    } = ctx.params;
    const content = await strapi.query('api::userdata.userdata').findOne({
      ...filters,
      id,
      'owner.id': ctx.state.user.id
    });
    return content;
  },
  
  async update(ctx){
    console.log('updating!')
    ctx.query.filters = {
        ...(ctx.query.filters || {}),
        owner: ctx.state.user.id
    };

    return await super.update(ctx);
  },
  async delete(ctx){
    ctx.query.filters = {
        ...(ctx.query.filters || {}),
        owner: ctx.state.user.id
    };

    return await super.delete(ctx);
  },
  
  async create(ctx) {
   console.log('creating!')
    return await super.create(ctx);
  }
}));