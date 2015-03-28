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


/***** tasks *****/

var yoruho = new CronJob('00 00 00 * * *', function () {
	channels.random.send('よるほー');
});
