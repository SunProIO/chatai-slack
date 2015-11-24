'use strict';

const CronJob = require('cron').CronJob;
const fs = require('fs');
const request = require('request');

// Initialize Timezone
process.env.TZ = 'Asia/Tokyo';

const slack = require('./slack');
const channels = Object.create(null);

const SECOND = 1000;
const MINUTE = 60 * SECOND;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

/***** Setup Logger *****/

class Logger {
	constructor() {
		this.pendingMessages = [];
	}
	setChannel(channel) {
		this.channel = channel;
		for (let message of this.pendingMessages) {
			this.channel.send(message);
		}
		this.pendingMessages = [];
	}
	getPrefix() {
		let prefix;
		if (process.env.CHATAI_ENV === 'development') {
			prefix = '【デバッグログ】';
		} else if (process.env.CHATAI_TYPE === 'day') {
			prefix = '【昼ちゃたい】';
		} else if (process.env.CHATAI_TYPE === 'night') {
			prefix = '【夜ちゃたい】';
		} else {
			prefix = '';
		}

		return prefix;
	}
	log(text) {
		const message = `${this.getPrefix()}${new Date().toISOString()} LOG: ${text}`;

		console.log(message);

		if (this.channel) {
			this.channel.send(message);
		} else {
			this.pendingMessages.push(message);
		}
	}
	error(text) {
		const message = `${this.getPrefix()}${new Date().toISOString()} ERROR: ${text}`;

		console.error(message);

		if (this.channel) {
			this.channel.send(message);
		} else {
			this.pendingMessages.push(message);
		}
	}
}

const logger = new Logger();

const GoogleClient = require('./google-client');
const googleClient = new GoogleClient({slack: slack, logger: logger})

const google = require('googleapis');
const drive = google.drive('v2');

let secret = null;


/***** Retrieve and setup config *****/

googleClient.on('authorize', () => {
	logger.log('Google APIで認証成功! chatai_secret.jsonを取得します!')

	drive.files.get({
		auth: googleClient.client,
		fileId: process.env.SECRET_JSON_ID,
		alt: 'media',
	}, (error, response) => {
		if (error) {
			return logger.error(error);
		}

		secret = response;
		logger.log('chatai_secret.json取得成功! 正常起動しました!');
	});
});


/***** Setup slack channels *****/

slack.on('open', function () {
	Object.keys(slack.channels).forEach(function (id) {
		channels[slack.channels[id].name] = slack.channels[id];

		if (slack.channels[id].name === 'chatai-log') {
			logger.setChannel(slack.channels[id]);

			if (process.env.CHATAI_TYPE === 'day') {
				logger.log('ふあー……おはよう、昼ちゃたいだよ! 今日も一日よろしくね!');
			} else if (process.env.CHATAI_TYPE === 'night') {
				logger.log('こんばんは、夜ちゃたいだよ。進捗どうですか?');
			}
		}
	});
});


/***** Setup Event Handler for SIGINT and SIGTERM *****/

process.on('SIGINT', exit);
process.on('SIGTERM', exit);

function exit() {
	logger.log('それじゃあ今日はもうお休みするね。明日もよろしく!');

	setTimeout(() => {
		process.exit(22);
	}, 1000);
}


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
