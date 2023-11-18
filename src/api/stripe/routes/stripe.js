console.log("Stripe route loaded");
console.log("SMTP Host:", process.env.SMTP_HOST)

module.exports = {
  routes: [
    {
      method: "POST",
      path: "/membership-type",
      handler: "stripe.membershipType",
      config: {
        policies: []
      }
    },
    {
      method: "POST",
      path: "/payments/verify",
      handler: "stripe.verifyPayment",
      config: {
        policies: []
      }
    },
    {
      method: "GET",
      path: "/test",
      handler: "stripe.test",
      config: {
        policies: []
      }
    },
    {
      method: "POST",
      path: "/webhooks/stripe",
      handler: "stripe.webhook",
      config: {
        middlewares: [],
      }
    },
    {
      method: "POST",
      path: "/get-stripe-data",
      handler: "stripe.getStripeData",
      config: {
        middlewares: [],
      }
    },
    {
      method: "POST",
      path: "/cancel-subscription",
      handler: "stripe.cancelSubscription",
      config: {
        middlewares: [],
      }
    },
    {
      method: "POST",
      path: "/renew-subscription",
      handler: "stripe.renewSubscription",
      config: {
        middlewares: [],
      }
    },
    {
      method: "POST",
      path: "/pause-subscription",
      handler: "stripe.pauseSubscription",
      config: {
        middlewares: [],
      }
    },
    {
      method: "POST",
      path: "/resume-subscription",
      handler: "stripe.resumeSubscription",
      config: {
        middlewares: [],
      }
    },
    {
      method: 'DELETE',
      path: '/delete-my-account',
      handler: 'stripe.deleteWithStripe',
      config: {
        policies: [],
      }
    },
  ],
};
