module.exports = [
  'global::bodyparser',
  'strapi::errors',
    {
    name: 'strapi::security',
    config: {
      contentSecurityPolicy: {
        directives: {
          "img-src": ["'self'", "data:", "blob:", "https://market-assets.strapi.io", "https://eatclassy.nyc3.cdn.digitaloceanspaces.com"]
        },
      },
    },
  },
  'strapi::cors',
  'strapi::poweredBy',
  'strapi::logger',
  'strapi::query',
  'strapi::body',
  'strapi::session',
  'strapi::favicon',
  'strapi::public',
];
