var Slack = require('slack-client');
var CronJob = require('cron').CronJob;
var google = require('googleapis');
var fs = require('fs');
var spawn = require('child_process').spawn;

var secret = require('./secret.json');

// Initialize Timezone
process.env.TZ = 'Asia/Tokyo';

/***** Slack things *****/

var slack = new Slack(secret.token, true, true);

var channels = {};

slack.on('open', function () {
	Object.keys(slack.channels).forEach(function (id) {
		channels[slack.channels[id].name] = slack.channels[id];
	});
});

slack.on('error', function (error) {
	console.error(error);
});

slack.login();


/***** Google API setups *****/

var OAuth2 = google.auth.OAuth2;
var oauth2Client = new OAuth2(
	secret.googleapis.installed.client_id,
	secret.googleapis.installed.client_secret,
	secret.googleapis.installed.redirect_uris[0]
);

oauth2Client.setCredentials({
	access_token: secret.googleapis.local.access_token,
	refresh_token: secret.googleapis.local.refresh_token,
});

var analytics = google.analytics({version: 'v3', auth: oauth2Client});


/***** Tasks *****/

// よるほー
var yoruho = new CronJob('00 00 00 * * *', function () {
	channels.random.send('よるほー');

	// Happy Birthday!
	var date = new Date();
	var month = date.getMonth() + 1;
	var day = date.getDate();
	var today = month + '/' + day;
	secret.birthdays.forEach(function (birthday) {
		if (today === birthday.day) {
			channels.random.send('今日は @' + birthday.id + ' さんの誕生日だよ! おめでとう! :birthday:');
		}
	});
}, null, true, 'Asia/Tokyo');

slack.on('message', function (message) {
	var channel = slack.getChannelGroupOrDMByID(message.channel);
	var user = slack.getUserByID(message.user);

	if (channel.name === 'random' && message.type === 'message' && message.text) {
		// プロ->趣味

		var puro = /([ぷプ][ろロ]|pro)/ig;

		// ignore frequently appearing words
		var ignores = [
			'プログラ',
			'program',
			'sunpro',
			'プロジェクト',
			'project',
		];
		var text = message.text.replace(new RegExp('(' + ignores.join('|') + ')', 'ig'), '');

		if (text.match(puro)) {
			var response = message.text.replace(puro, function (match) {
				return match
					.replace(/[ぷプ][ろロ]/g, '趣味')
					.replace(/p/g, 's')
					.replace(/P/g, 'S')
					.replace(/r/g, 'hu')
					.replace(/R/g, 'HU')
					.replace(/o/g, 'mi')
					.replace(/O/g, 'MI');
			}) + ' @' + user.name;

			channel.send(response);
		}

		// ちゃたいコマンド

		var execChatai = false;

		// Execute on reply
		if (message.text.length < 200) {
			if (message.text.match('<@' + slack.self.id + '>')) {
				execChatai = 'force';
			} else if (Math.random() < .1) {
				execChatai = 'possible';
			}
		}

		if (execChatai) {
			// Remove meta sequences and emojies
			var input = message.text.replace(/(<.+?>|:.+?:)/g, '');

			var command = spawn('shly', [
				'run',
				input,
				'--debug', 't'
			], {
				cwd: '/home/hakatashi/chatai-command'
			});

			var reply = '';
			command.stdout.on('data', function (chunk) {
				reply += chunk;
			});
			command.on('close', function (exitCode) {
				if (exitCode === 0) {
					// Strip heading and trailing whitespaces
					reply = reply.replace(/(^\s+|\s+$)/g, '');

					// If reply is empty or NIL
					if (reply === '' || reply === 'NIL') {
						// Reply emoji if force reply
						if (execChatai === 'force') {
							var emojies = ['sleeping', 'confused', 'sleepy', 'persevere', 'shit', 'open_hands'];
							var emoji = emojies[Math.floor(Math.random() * emojies.length)];
							channel.send('@' + user.name + ' :' + emoji + ':');
						}
					} else {
						// If reply is not empty
						channel.send('@' + user.name + ' ' + reply.slice(0, 200));
					}
				}
			});
		}
	}
});
