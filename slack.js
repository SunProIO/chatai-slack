/***** Slack things *****/

const Slack = require('slack-client');
const slack = new Slack(process.env.SLACK_TOKEN, true, true);

slack.on('error', function (error) {
	console.error(error);
});

slack.login();


module.exports = slack;
