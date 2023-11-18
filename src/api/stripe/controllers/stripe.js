'use strict';

/**
 * A set of functions called "actions" for `stripe`
 */

const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

function getStripeProductId(membershipType) {
  // Define your mapping logic here
  const mapping = {
    'basic': process.env.MEMBERSHIP_BASIC,
    'pro': process.env.MEMBERSHIP_PRO,
    'premium': process.env.MEMBERSHIP_PREMIUM,
  };

  return mapping[membershipType] || null;
}

async function getPriceDetails(stripePriceId) {
  try {
    // Fetch the price object from Stripe
    const price = await stripe.prices.retrieve(stripePriceId);

    return {
      price: price.unit_amount, // Price in the smallest currency unit (e.g., cents for USD)
      currency: price.currency, // Currency of the price
    };
  } catch (error) {
    console.error(`Error fetching price details: ${error.message}`);
    throw error; // Rethrow the error to be handled by the caller
  }
}

module.exports = {
  test: async (ctx) => {
    ctx.send('Test route working');
  },
  membershipType: async (ctx) => {
    try {
      const { membershipType, userId } = ctx.request.body;

      // Retrieve the Stripe Customer ID for the user
      //const user = await strapi.plugins['users-permissions'].services.user.fetch({ id: userId });
      const user = await strapi.entityService.findOne('plugin::users-permissions.user', userId, { 
      });
      console.log("user: ", user)
      //console.log("user: ", user.stripCustomerId)
      const stripeCustomerId = user.stripeCustomerId;

      // Map the membership type to the Stripe product ID and retrieve price details
      const stripeProductId = getStripeProductId(membershipType);
      const { price, currency } = await getPriceDetails(stripeProductId);

      if (!stripeProductId) {
        return ctx.badRequest('Invalid membership type');
      }

      // Create a payment intent
      const paymentIntent = await stripe.paymentIntents.create({
        amount: price, // should be in the smallest currency unit, e.g., cents
        currency: currency,
        customer: stripeCustomerId,
      });

      // Send the client secret to the frontend
      ctx.body = {
        stripeClientSecret: paymentIntent.client_secret,
        stripeProductId,
      };
    } catch (error) {
      ctx.throw(500, error);
    }
  },
  verifyPayment: async (ctx) => {
    console.log("Verifying payment...")
    const { paymentIntentId } = ctx.request.body;
    console.log("paymentIntentId: ", paymentIntentId)

    try {
      const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

      if (paymentIntent.status === 'succeeded') {
        // Handle successful payment here (e.g., update user status, record transaction)
        ctx.send({ status: 'success', message: 'Payment successful' });
      } else {
        // Handle failed payment here
        ctx.send({ status: 'failure', message: 'Payment failed' });
      }
    } catch (error) {
      ctx.throw(500, `Error verifying payment: ${error.message}`);
    }
  },
  webhook: async (ctx) => {
    const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;
    const sig = ctx.request.headers['stripe-signature'];

    let event;
    let userDataId;
    
    //const stripeCustomerId = '???';
    //console.log("FOUND STRIPE CUSTOMER ID: ", stripeCustomerId)

    try {
      //console.log(ctx.request.rawBody)
      event = stripe.webhooks.constructEvent(
        ctx.request.rawBody, // Ensure rawBody is populated correctly
        sig,
        endpointSecret
      );
      
    } catch (err) {
      console.log(err.message);  // Log the error message to the console
      ctx.status = 400;
      ctx.body = `Webhook Error: ${err.message}`;
      return;
    }

    // Handle the event
    switch (event.type) {
      case 'payment_intent.created':
        console.log('PaymentIntent was created...');
        break;
      //case 'payment_intent.succeeded':
      //  console.log('PaymentIntent was successful...');
      //  break;
      //case 'checkout.session.completed':
      //case 'charge.succeeded':
      case 'payment_intent.succeeded':
        console.log('PaymentIntent succeeded...');
        const paymentIntent = event.data.object;

        // Access the Stripe customer ID from the payment intent
        const stripeCustomerId = paymentIntent.customer;
        console.log('Stripe Customer ID:', stripeCustomerId);
        try {
          
          // Get Stripe customer ID from the payment intent
          //const stripeCustomerId = checkoutSessionSucceeded.customer;
          //const customerDetails = checkoutSessionSucceeded.customer_details;

          //console.log("Customer Details: ", customerDetails)

          //const customerName = customerDetails.name;

          //console.log("Customer Name: ", customerName)

          const user = await strapi.entityService.findMany('plugin::users-permissions.user', { 
            filters: {
              stripeCustomerId: stripeCustomerId
            }
          });

          console.log("Webhook User Def: ", user)

          const userId = user[0].id

          const userdata = await strapi.entityService.findMany('api::userdata.userdata', {
            populate: "owner",
            filters: {
              'owner': {
                id: userId,
              }
            },
          });

          console.log("userdata: ", userdata[0])

          console.log("User ID:", userId)

          userDataId = userdata[0].id;
          console.log("User Data ID:", userDataId)

          if (!userdata) {
            throw new Error('User data not found');
          }
          
          console.log("Stripe ID:", stripeCustomerId)
          
          // Update userdata by user id: field paid membership to true
          console.log('Trying to update userdata paid membership field...');
          const updateUserData = await strapi.entityService.update('plugin::users-permissions.user', userId,  {
            data: {
              paidMembershipTierOne: true,
              //fullName: customerName,
              freeAccount: false,
            }
          })
          /*
          const updateUserName = await strapi.entityService.update("plugin::users-permissions.user", userId, {
            data: {
              fullName: customerName,
            }
          });*/

          if (userDataId) {
            console.log('userDataId exists...');
            try {
              // Use Strapi's email service
              console.log('Attempting to send welcome email to: ', customerDetails.email);
              await strapi.plugins['email'].services.email.send({
                from: 'Nick at eatclassy.com <nick@eatclassy.com>',
                to: customerDetails.email, // replace with user's email
                subject: 'EatClassy Membership Activated!',
                text: 'Congratulations! Your EatClassy membership has been activated. You can now create more recipes and save recipes to your account. To manage your membership, use your account billing page at https://www.eatclassy.com/settings/billing',
                html: '<p style="font-family: Arial, sans-serif;">Congratulations! Your EatClassy membership has been activated. You can now create more recipes and save recipes to your account.</p><p style="font-family: Arial, sans-serif;">To manage your subscription, use your account billing page at <a href="https://www.eatclassy.com/settings/billing">https://www.eatclassy.com/settings/billing</a>.</p> <p>- Nick at eatclassy</p>',
              });

            } catch (err) {
              console.error('Error sending email:', err);
            }
          }
        } catch (err) {
          console.log('Error updating user details:', err);
        }

        console.log('Checkout session complete.');        

        break;

      default:
        console.log(`Unhandled event type ${event.type}`);
    }

    // Return a 200 response to acknowledge receipt of the event
    ctx.status = 200;
  },
  async getStripeData(ctx) {
    try {
      const customerId = ctx.request.body.stripeCustomerId;

      if (!customerId) {
        throw new Error('Stripe Customer ID not found');
      }

      const customer = await stripe.customers.retrieve(customerId);

      let subscriptions = await stripe.subscriptions.list({ customer: customerId });
      subscriptions = await Promise.all(
        subscriptions.data.map(async (subscription) => {
          // Get the product details
          const product = await stripe.products.retrieve(
            subscription.items.data[0].price.product
          );
          // Get the price details
          const price = await stripe.prices.retrieve(
            subscription.items.data[0].price.id
          );

          return {
            priceId: subscription.items.data[0].price.id,
            title: product.name,
            description: product.description,
            price: price.unit_amount / 100,
            currency: price.currency,
            nextPaymentDate: new Date(subscription.current_period_end * 1000).toDateString(),
            becomesInactiveOn: subscription.cancel_at_period_end
              ? new Date(subscription.current_period_end * 1000).toDateString()
              : null,
            canceled: subscription.canceled_at ? true : false,
            active: subscription.status === 'active',
            subscriptionId: subscription.id,
            pause_collection: subscription.pause_collection,
          };
        })
      );

      ctx.send({
        customer,
        subscriptions,
      });
    } catch (error) {
      console.error('Error fetching Stripe data:', error);
      ctx.throw(400, 'Error fetching Stripe data');
    }
  },
  async cancelSubscription(ctx) {
    try {
      const { subscriptionId } = ctx.request.body;

      if (!subscriptionId) {
        throw new Error('Subscription ID not found');
      }

      // Cancel the subscription using Stripe API
      const canceledSubscription = await stripe.subscriptions.update(subscriptionId, {
        cancel_at_period_end: true, // Set to true if you want to cancel the subscription at the end of the current billing period
      });

      ctx.send({
        canceledSubscription,
      });
    } catch (error) {
      console.error('Error canceling subscription:', error);
      ctx.throw(400, 'Error canceling subscription');
    }
  },
  async renewSubscription(ctx) {
    try {
      const { customerId, priceId } = ctx.request.body;

      // Ensure you have the necessary details like customerId and priceId
      if (!customerId || !priceId) {
        throw new Error('Customer ID and price ID are required');
      }

      // Create a new checkout session for the subscription renewal
      const session = await stripe.checkout.sessions.create({
        //payment_method_types: ['card'],
        line_items: [
          {
            price: priceId,
            quantity: 1,
          },
        ],
        mode: 'subscription',
        success_url: process.env.SUCCESS_URL,
        cancel_url: process.env.CANCEL_URL,
        customer: customerId,
      });

      // Send the ID of the newly created checkout session in the response
      ctx.send({
        sessionId: session.id,
      });
    } catch (error) {
      console.error('Error creating checkout session:', error);
      ctx.throw(400, 'Error creating checkout session');
    }
  },

  async pauseSubscription(ctx) {
    try {
      const { subscriptionId } = ctx.request.body;

      if (!subscriptionId) {
        throw new Error('Subscription ID not found');
      }

      // Pause the subscription using Stripe API
      const pausedSubscription = await stripe.subscriptions.update(subscriptionId, {
        pause_collection: {
          behavior: 'keep_as_draft',
        },
      });

      ctx.send({
        pausedSubscription,
      });
    } catch (error) {
      console.error('Error pausing subscription:', error);
      ctx.throw(400, 'Error pausing subscription');
    }
  },

  async resumeSubscription(ctx) {
    try {
      const { subscriptionId } = ctx.request.body;

      if (!subscriptionId) {
        throw new Error('Subscription ID not found');
      }

      // Resume the subscription using Stripe API
      const resumedSubscription = await stripe.subscriptions.update(subscriptionId, {
        pause_collection: null,
      });

      ctx.send({
        resumedSubscription,
      });
    } catch (error) {
      console.error('Error resuming subscription:', error);
      ctx.throw(400, 'Error resuming subscription');
    }
  },

  async deleteWithStripe(ctx) {
    // Get the authenticated user's ID from the context
    const userId = ctx.state.user.id;

    try {
      console.log("Deleting user...")
      // Fetch user to get the stripeCustomerId
      const user = await strapi.entityService.findOne(
        "plugin::users-permissions.user",
        userId,
        {
          populate: [
            "userData"
          ],
        }
      );
      //const user = await strapi.plugins['users-permissions'].services.user.findOne({ userId });
      console.log("User:", user)
      if (!user) throw new Error('User not found');

      // If the user has a Stripe customer ID, cancel their Stripe subscriptions
      if (user.stripeCustomerId) {
        console.log("Stripe customer ID found...", user.userData.stripeCustomerId);
        try {
          const subscriptions = await stripe.subscriptions.list({
            customer: user.userData.stripeCustomerId,
          });
          
          for (const subscription of subscriptions.data) {
            await stripe.subscriptions.cancel(subscription.id);
          }
          console.log("Subscriptions canceled...");
        } catch (stripeError) {
          console.error("Error with Stripe:", stripeError.message);
          // Even if there's an error with Stripe, continue deleting userdata and user
        }
      }

      console.log("Deleting userdata...");
      // Delete the userdata associated with the user
      await strapi.entityService.delete('api::userdata.userdata', user.userData.id);
      console.log("Deleting user...");
      // Delete the user from Strapi
      await strapi.entityService.delete("plugin::users-permissions.user", userId);

      console.log("User deleted...");
      ctx.send({ message: 'Your account and associated data have been deleted successfully' });

    } catch (error) {
      ctx.throw(500, error.message);
    }
  }

};