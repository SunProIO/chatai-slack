var Slack = require('slack-client');
var CronJob = require('cron').CronJob;

var secret = require('./secret');

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


/***** Tasks *****/

// よるほー
var yoruho = new CronJob('00 00 00 * * *', function () {
	channels.random.send('よるほー');
}, null, true, 'Asia/Tokyo');

// プロ->趣味
slack.on('message', function (message) {
	var channel = slack.getChannelGroupOrDMByID(message.channel);
	var user = slack.getUserByID(message.user);

	if (channel.name === 'random' && message.type === 'message' && message.text) {
		var puro = /([ぷプ][ろロ]|pro)/ig;

		// ignore frequently appeared words
		var ignores = [
			'プログラ',
			'program',
			'sunpro',
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
	}
});
