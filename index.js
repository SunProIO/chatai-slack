var CronJob = require('cron').CronJob;
var fs = require('fs');

var secret = require('./secret.json');

// Initialize Timezone
process.env.TZ = 'Asia/Tokyo';

const slack = require('./slack');

const GoogleClient = require('./google-client');
const googleClient = new GoogleClient({slack: slack})

const google = require('googleapis');
const drive = google.drive('v2');

let config = null;

/***** Retrieve and setup config *****/

googleClient.on('authorize', () => {
	drive.files.get({
		auth: googleClient.client,
		fileId: process.env.SECRET_JSON_ID,
		alt: 'media',
	}, (error, response) => {
		if (error) {
			return console.error(error);
		}

		config = response;
	});
});


/***** Cron Jobs *****/

function yoruho() {
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
}

// よるほー
const yoruhoJob = new CronJob('00 00 00 * * *', yoruho, null, true, 'Asia/Tokyo');


/***** Event Handlers *****/

// プロ->趣味
slack.on('message', function (message) {
	var channel = slack.getChannelGroupOrDMByID(message.channel);
	var user = slack.getUserByID(message.user);

	if (channel.name === 'random' && message.type === 'message' && message.text) {
		var puro = /([ぷプ][ろロ]|pro)/ig;

		// ignore frequently appearing words
		var ignores = [
			'プログラ',
			'program',
			'sunpro',
			'プロジェクト',
			'project',
			'プロセス',
			'process',
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
