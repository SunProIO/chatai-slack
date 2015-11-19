'use strict';

// unexplained hogehoge :)

var fs = require('fs');
var secret = JSON.parse(fs.readFileSync('secret.json'));
var Reflect = require('harmony-reflect');

var makeProxy = function (object, parent, proxy, key) {
	object.__parent__ = parent;
	object.__proxy__ = proxy;
	object.__key__ = key;

	return new Proxy(object, {
		get: function (target, name) {
			if (typeof target[name] === 'undefined') {
				return undefined;
			} else if (typeof target[name] === 'object') {
				return makeProxy(target[name], target, this, name);
			} else {
				return target[name];
			}
		},
		set: function (target, name, value) {
			target[name] = value;

			if (target.__parent__ === null) {
				var sanitize = function (object) {
					var newObject = {};

					for (var key in object) if (object.hasOwnProperty(key)) {
						if (key === '__parent__' || key === '__proxy__' || key === '__key__') {
							// skip
						} else if (typeof object[key] === 'object') {
							newObject[key] = sanitize(object[key]);
						} else {
							newObject[key] = object[key];
						}
					}

					return newObject;
				}

				var data = sanitize(target);
				fs.writeFile('secret.json', JSON.stringify(data, null, 2));
			} else {
				target.__proxy__.set(target.__parent__, target.__key__, target);
			}
		}
	});
};

module.exports = makeProxy(secret, null, null, null);
