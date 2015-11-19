'use strict';

const google = require('googleapis');
const redis = require('redis');
const SCOPES = ['https://www.googleapis.com/auth/drive.readonly'];

const EventEmitter2 = require('eventemitter2').EventEmitter2;

class GoogleClient extends EventEmitter2 {
	constructor(config) {
		super(config);

		this.slack = config.slack;
		this.redis = redis.createClient(process.env.REDIS_URL);

		this.authorized = false;

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
			this.authorize();
		} else {
			this.slack.on('open', () => {
				this.authorize();
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
				this.authorized = true;
				this.emit('authorize');
				if (typeof callback === 'function') {
					callback.call(this);
				}
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
					this.authorized = true;
					this.storeToken();

					this.emit('authorize');

					if (typeof callback === 'function') {
						callback.call(this);
					}
				});

				this.slack.removeListener('message', processMessage);
			}
		}
	}

	storeToken() {
		this.redis.set('google_token', JSON.stringify(this.client.credentials));
		console.log('Token stored');
	}

	refresh(callback) {
		this.client.refreshAccessToken((error, tokens) => {
			this.client.credentials = tokens;
			this.storeToken();

			if (typeof callback === 'function') {
				callback();
			}
		});
	}
}

module.exports = GoogleClient;
