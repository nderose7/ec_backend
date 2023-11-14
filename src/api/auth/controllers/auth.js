//const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

module.exports = {
  register: async (ctx) => {
    try {
      // Step 1: Register the user in Strapi
      /*
      const { email, password } = ctx.request.body;
      const user = await strapi.plugins['users-permissions'].services.user.add({
        username: email,
        email,
        password,
      });*/
      // On frontend now using nuxt/strapi module register function

      const { userId, email } = ctx.request.body;

      // Step 2: Create a new Stripe customer
      //const customer = await stripe.customers.create({ email });

      //console.log(customer.id)

      // Step 3: Update the Strapi user with the Stripe Customer ID
      /*
      await strapi.entityService.update(
        { entity: 'plugins::users-permissions', id: user.id },
        { stripeCustomerId: customer.id }
      );*/
      
      console.log("Attempting to create userdata...")

      console.log(userId)
      // Step 3: Create a new entry in the userdata collection and associate it with the new user
      const userdata = await strapi.entityService.create('api::userdata.userdata', { 
        data: {
          //stripeCustomerId: customer.id,
          owner: {
            connect: [userId]
          },
          publishedAt: new Date(),
        }
      });
      /*
      const updateUser = await strapi.entityService.update('plugin::users-permissions.user', userId, { 
        data: {
          stripeCustomerId: customer.id,
        }
      });
      try {
        await strapi.plugins['email'].services.email.send({
          from: 'Nick DeRose | ManicDream.com <nick@manicdream.com>',
          to: email, // replace with user's email
          subject: 'Welcome to ManicDream!',
          text: 'Welcome! Your ManicDream account has been created. You can now use the forum and access free downloads. Thanks for joining! - Nick DeRose',
          html: '<p style="font-family: Arial, sans-serif;">Welcome! Your ManicDream account has been created. You can now use the forum and access free downloads.</p> <p style="font-family: Arial, sans-serif;">Thanks for joining!</p> <p style="font-family: Arial, sans-serif;">- Nick DeRose </p>',
        });
      } catch (err) {
        console.error('Error sending email to new user:', err);
      }

      try {
      // Send email using Strapi's email plugin
      await strapi.plugins['email'].services.email.send({
          to: 'nick@manicdream.com',
          from: email,
          subject: 'New User!',
          text: "New User: " + email,
          html: `<p style="font-family: Arial, sans-serif;"><b>New User:</b> ${email}`,
      });
      } catch (err) {
        console.error('Error sending email to nick:', err);
      }*/
      
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
