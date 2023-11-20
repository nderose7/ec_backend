module.exports =  ({ env }) => ({
	connection: {
		client: 'postgres',
		connection: {
		host: env('DATABASE_HOST', 'localhost'),
			port: env.int('DATABASE_PORT', 5432),
			database: env('DATABASE_NAME', 'ec-backend'),
			user: env('DATABASE_USERNAME', 'ec-backend'),
			password: env('DATABASE_PASSWORD', 'ec-backend'),
			ssl: {
				rejectUnauthorized:env.bool('DATABASE_SSL_SELF', false),
			},
		}
	}
});
