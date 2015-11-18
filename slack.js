/***** Slack things *****/

const Slack = require('slack-client');

const slack = new Slack(process.env.slack_token, true, true);

const channels = {};

slack.on('open', function () {
	Object.keys(slack.channels).forEach(function (id) {
		channels[slack.channels[id].name] = slack.channels[id];
	});
});

slack.on('error', function (error) {
	console.error(error);
});

slack.login();


module.exports = slack;
