module.exports = {
	token: 'xxxx-0000000000-xxxxxxxxxxxxxxxxxxxxxxxx',
	googleapis: {
		// you can directly input exported key.json file from google console here
		installed: {
			auth_uri: 'https://accounts.google.com/o/oauth2/auth',
			client_secret: 'xxxxxxxxxxxxxxxxxxxxxxxx',
			token_uri: 'https://accounts.google.com/o/oauth2/token',
			client_email: '',
			redirect_uris: [
				'localhost',
			],
			client_x509_cert_url: '',
			client_id: '000000000000-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx.apps.googleusercontent.com',
			auth_provider_x509_cert_url: 'https://www.googleapis.com/oauth2/v1/certs',
		},
		// you have to get access token manually
		local: {
			access_token: 'xxxx.xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
			token_type: 'Bearer',
			refresh_token: 'xxxxxxxxxxxxxxxxxxxx-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
			expiry_date: 1000000000000,
		},
	},
};
