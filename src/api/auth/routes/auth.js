console.log("Auth route loaded");

module.exports = {
  routes: [
    {
      method: 'POST',
      path: '/auth/register',
      handler: 'auth.register',
      config: {
        description: 'Custom register endpoint',
        tags: ['auth'],
        auth: false,
      },
    }
  ],
};
