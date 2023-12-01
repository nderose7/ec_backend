const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

module.exports = {
  register: async (ctx) => {
    try {
      const { userId, email } = ctx.request.body;

      // Step 2: Create a new Stripe customer
      const customer = await stripe.customers.create({ email });

      console.log(customer.id)
      console.log("Attempting to create userdata...")

      console.log(userId)
      // Step 3: Create a new entry in the userdata collection and associate it with the new user
      const userdata = await strapi.entityService.create('api::userdata.userdata', { 
        data: {
          owner: {
            connect: [userId]
          },
          publishedAt: new Date(),
        }
      });
      
      const updateUser = await strapi.entityService.update('plugin::users-permissions.user', userId, { 
        data: {
          stripeCustomerId: customer.id,
        }
      });
      try {
        await strapi.plugins['email'].services.email.send({
          from: 'Nick at EatClassy.com <nick@eatclassy.com>',
          to: email, // replace with user's email
          subject: 'Welcome to EatClassy!',
          text: 'Welcome! Your EatClassy account has been created. You can now save recipes and we hooked you up with 25 free credits. Thanks for joining! - Nick at EatClassy',
          html: '<p style="font-family: Arial, sans-serif;">Welcome! Your EatClassy account has been created. You can now save recipes and we hooked you up with 25 free credits.</p> <p style="font-family: Arial, sans-serif;">Thanks for joining!</p> <p style="font-family: Arial, sans-serif;">- Nick at EatClassy </p>',
        });
      } catch (err) {
        console.error('Error sending email to new user:', err);
      }

      try {
      // Send email using Strapi's email plugin
      await strapi.plugins['email'].services.email.send({
          to: 'nick@eatclassy.com',
          from: email,
          subject: 'New User!',
          text: "New User: " + email,
          html: `<p style="font-family: Arial, sans-serif;"><b>New User:</b> ${email}`,
      });
      } catch (err) {
        console.error('Error sending email to nick:', err);
      }
      
      ctx.send({
        userdata
      });

    } catch (error) {
      console.error(error);
      ctx.status = 500;
      ctx.send({ error: error.message });
    }
  },
};
