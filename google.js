'use strict';

const google = require('googleapis');
const redis = require('redis');
const SCOPES = ['https://www.googleapis.com/auth/drive.readonly'];

class GoogleClient {
	constructor(config) {
		this.slack = config.slack;
		this.redis = redis.createClient(process.env.REDIS_URL);

		// Load client secrets from environment variable
		if (!process.env.GOOGLE_CLIENT_SECRETS) {
			console.error('Error loading client secrets');
			return;
		}

		try {
			this.credentials = JSON.parse(process.env.GOOGLE_CLIENT_SECRETS);
		} catch (error) {
			console.error(`Error parsing client secrets: ${error}`);
		}

		// Authorize a client with the loaded credentials
		if (this.slack.connected) {
			this.authorize(this.listFiles);
		} else {
			this.slack.on('open', () => {
				this.authorize(this.listFiles);
			});
		}
	}

	authorize(callback) {
		var clientSecret = this.credentials.installed.client_secret;
		var clientId = this.credentials.installed.client_id;
		var redirectUrl = this.credentials.installed.redirect_uris[0];
		this.client = new google.auth.OAuth2(clientId, clientSecret, redirectUrl);

		// Check if we have previously stored a token.
		this.redis.get("google_token", (err, token) => {
			if (err || token === null) {
				this.getNewToken(callback);
			} else {
				this.client.credentials = JSON.parse(token);
				callback.call(this);
			}
		});
	}

	getNewToken(callback) {
		var authUrl = this.client.generateAuthUrl({
			access_type: 'offline',
			scope: SCOPES
		});

		Object.keys(this.slack.dms).forEach((id) => {
			const dm = this.slack.getDMByID(id);

			if (dm.name === 'hakatashi') {
				dm.send('Hey hakatashi');
				dm.send(`Autorhize me by visiting this url: ${authUrl}\nand send me secret code!`);
			}
		});

		this.slack.on('message', processMessage.bind(this));

		function processMessage(message) {
			const dm = this.slack.getDMByID(message.channel);

			if (dm && dm.name === 'hakatashi' && message.type === 'message' && this.slack.getUserByID(message.user).name === 'hakatashi') {
				const code = message.text.trim();

				this.client.getToken(code, (error, token) => {
					if (error) {
						console.error(`Error while trying to retrieve access token: ${error}`);
						dm.send(`Error while trying to retrieve access token: ${error}`);
						return;
					}

					dm.send('Thanks!');

					this.client.credentials = token;
					this.storeToken();
					callback.call(this);
				});

				this.slack.removeListener('message', processMessage);
			}
		}
	}

	storeToken() {
		this.redis.set('google_token', JSON.stringify(this.client.credentials));
		console.log('Token stored');
	}

	listFiles() {
		const drive = google.drive('v2');

		drive.files.list({
			auth: this.client,
			maxResults: 10,
		}, (err, response) => {
			if (err) {
				console.log('The API returned an error: ' + err);
				return;
			}

			Object.keys(this.slack.dms).forEach((id) => {
				const dm = this.slack.getDMByID(id);

				if (dm.name === 'hakatashi') {
					dm.send(`Files: ${response.items.map((item) => item.title).join()}`);
				}
			});
		});
	}
}

module.exports = GoogleClient;
