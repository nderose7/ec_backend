module.exports = ({ env }) => ({
  email: {
    config: {
      provider: 'nodemailer',
      providerOptions: {
        host: env('SMTP_HOST'),
        port: env('SMTP_PORT'),
        auth: {
          user: env('SMTP_USERNAME'),
          pass: env('SMTP_PASSWORD'),
        },
      },
      settings: {
        defaultFrom: 'Nick at EatClassy.com <nick@eatclassy.com>',
        defaultReplyTo: 'nick@eatclassy.com',
      },
    },
  },
  upload: {
    config: {
      provider: '@strapi/provider-upload-aws-s3',
      providerOptions: {
        accessKeyId: env('DO_SPACES_ACCESS_KEY_ID'),
        secretAccessKey: env('DO_SPACES_SECRET_ACCESS_KEY'),
        endpoint: env('DO_SPACES_ENDPOINT'), // e.g., 'nyc3.digitaloceanspaces.com'
        region: 'nyc3',
        params: {
          Bucket: env('DO_SPACES_BUCKET'),
        },
      },
    },
  },
})