console.log("Stripe route loaded");
console.log("SMTP Host:", process.env.SMTP_HOST)

module.exports = {
  routes: [
    {
      method: "POST",
      path: "/create-customer-portal-session",
      handler: "stripe.createCustomerPortalSession",
      config: {
        policies: []
      }
    },
    {
      method: "POST",
      path: "/calculate-immediate-charge",
      handler: "stripe.calculateImmediateCharge",
      config: {
        policies: []
      }
    },
    {
      method: "POST",
      path: "/preview-plan-change",
      handler: "stripe.previewPlanChange",
      config: {
        policies: []
      }
    },
    {
      method: "POST",
      path: "/update-subscription",
      handler: "stripe.updateSubscription",
      config: {
        policies: []
      }
    },
    {
      method: "POST",
      path: "/create-payment-intent",
      handler: "stripe.createPaymentIntent",
      config: {
        policies: []
      }
    },
    {
      method: "POST",
      path: "/create-setup-intent",
      handler: "stripe.createSetupIntent",
      config: {
        policies: []
      }
    },
    {
      method: "POST",
      path: "/create-subscription",
      handler: "stripe.createSubscription",
      config: {
        policies: []
      }
    },
    {
      method: "POST",
      path: "/verify-subscription",
      handler: "stripe.verifySubscription",
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
