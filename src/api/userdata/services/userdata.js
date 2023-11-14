'use strict';

/**
 * userdata service
 */

const { createCoreService } = require('@strapi/strapi').factories;

module.exports = createCoreService('api::userdata.userdata');
