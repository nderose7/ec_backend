'use strict';

/**
 * review router
 */

const { createCoreRouter } = require('@strapi/strapi').factories;

module.exports = createCoreRouter('api::review.review', {
  config: {
    create: {
      middlewares: ['global::assign-owner-user'],
    },
    update: {
      policies: ['global::is-owner-user']
    },
    delete: {
      policies: ['global::is-owner-user']
    }
  }
});

