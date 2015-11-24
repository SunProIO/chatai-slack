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

		if (process.env.CHATAI_ENV !== 'development') {
			if (this.channel) {
				this.channel.send(message);
			} else {
				this.pendingMessages.push(message);
			}
		}
	}
	error(text) {
		const message = `${this.getPrefix()}${new Date().toISOString()} ERROR: ${text}`;

		console.error(message);

		if (process.env.CHATAI_ENV !== 'development') {
			if (this.channel) {
				this.channel.send(message);
			} else {
				this.pendingMessages.push(message);
			}
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

	trelloNotify();
}

function trelloNotify() {
	let remainingJobs = 2;
	const listCardsURL = `https://api.trello.com/1/boards/${secret.trello.boardId}/cards`;

	request({
		url: listCardsURL,
		method: 'GET',
		qs: {
			key: secret.trello.key,
			token: secret.trello.token,
			fields: 'shortUrl,name,due',
			filter: 'open',
			members: 'true',
			member_fields: 'fullName,username',
		},
		json: true,
	}, (error, response, data) => {
		if (error) {
			return logger.error(error);
		}

		const now = Date.now();

		for (let card of data) {
			if (card.due === null) {
				continue;
			}

			const title = `タスク<${card.shortUrl}|「${card.name}」>`;

			const notify = (text) => {
				let message;

				if (card.members.length === 0) {
					message = text;
				} else {
					const mentions = card.members.map((member) => `@${member.fullName}`).join(' ');
					message = `${mentions} ${text}`;
				}

				channels.random.postMessage({
					text: message,
					as_user: 'true',
					link_names: '1',
					unfurl_links: 'true',
					unfurl_media: 'true',
				});
			};

			const due = Date.parse(card.due);
			const dayLimit = Math.ceil((due - now) / DAY);

			if (dayLimit < 0) {
				notify(`${title}の期限を${Math.abs(dayLimit)}日過ぎてるよ! しっかりして!`);
			} else if (dayLimit === 0) {
				notify(`${title}の期限は今日だよ! 進捗は大丈夫?`);
			} else if (dayLimit === 1) {
				notify(`明日は${title}の期限だよ!`);
			} else if (dayLimit === 2) {
				notify(`${title}の期限まであと2日だよ!`);
			} else if (dayLimit === 3) {
				notify(`${title}の期限まであと3日だよ! 進捗どうですか?`);
			} else if (dayLimit === 7) {
				notify(`${title}の期限まであと一週間だよ。そろそろ取り掛かろう!`);
			}
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
