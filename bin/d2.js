//noinspection Eslint
(function(){
	'use strict';

	var conf = require('../conf/configuration.json');
	var Q = require('q');
	var request = require('request');

	module.exports.put = put;
	module.exports.patch = patch;
	module.exports.get = get;
	module.exports.post = post;

	var debug = false;


	function post(url, payload, serverInfo) {

		var deferred = Q.defer();
		var debug = false;

		url = serverInfo.url + url;
		if (debug) console.log("POST request: " + url);

		request.post({
			uri: url,
			json: true,
			body: payload,
			auth: {
				'user': serverInfo.user,
				'pass': serverInfo.password
			}
		}, function (error, response, data) {
			if (debug) console.log(data);
			if (!error && (response.statusCode >= 200 && response.statusCode < 300)) {
				deferred.resolve(data);
			}
			else {
				console.log("Error in POST");
				console.log(data);
				if (data && data.response && data.response.errorReports) {
					for (var i = 0; i < data.response.errorReports.length; i++) {
						console.log(data.response.errorReports[i]);
					}
				}
				deferred.reject({'data': data, 'error': error, 'status': response.statusCode});
			}
		});

		return deferred.promise;
	}


	function put(url, payload, serverInfo) {

		var deferred = Q.defer();

		url = serverInfo.url + url;
		if (debug) console.log("Put request: " + url);

		request.put({
			uri: url,
			json: true,
			body: payload,
			auth: {
				'user': serverInfo.user,
				'pass': serverInfo.password
			}
		}, function (error, response, data) {
			if (!error && (response.statusCode >= 200 && response.statusCode < 300)) {
				deferred.resolve(data);
			}
			else {
				console.log("Error in PUT");
				deferred.reject({'data': data, 'error': error, 'status': response.statusCode});
			}
		});

		return deferred.promise;
	}


	function patch(url, payload, serverInfo) {

		var deferred = Q.defer();

		url = serverInfo.url + url;
		if (debug) console.log("Patch request: " + url);

		request.patch({
			uri: url,
			json: true,
			body: payload,
			auth: {
				'user': serverInfo.user,
				'pass': serverInfo.password
			}
		}, function (error, response, data) {
			if (!error && (response.statusCode >= 200 && response.statusCode < 300)) {
				deferred.resolve(true);
			}
			else {
				console.log("Error in PATCH");
				deferred.reject({'data': data, 'error': error, 'status': response.statusCode});
			}
		});

		return deferred.promise;
	}


	var getQ;
	var getCurrent = null;
	function get(url, serverInfo) {
		var deferred = Q.defer();

		if (!getQ) getQ = [];

		getQ.push({ 'url': url, 'deferred': deferred, 'serverInfo': serverInfo});

		getNow();

		return deferred.promise;
	}

	function getNow() {

		if (getCurrent) return;
		else if (getQ.length === 0) {
			return;
		}
		else {
			getCurrent = getQ.pop();
		}

		var url = getCurrent.serverInfo.url + getCurrent.url;
		if (debug) console.log("GET request: " + url);

		request.get({
			uri: url,
			json: true,
			auth: {
				'user': getCurrent.serverInfo.user,
				'pass': getCurrent.serverInfo.password
			},
			forever: true
		}, function (error, response, data) {
			if (!error && (response.statusCode >= 200 && response.statusCode < 300)) {
				getCurrent.deferred.resolve(data)
				getCurrent = null;
				getNow();
			}
			else {
				console.log("Error in GET");
				getCurrent.deferred.reject({'data': data, 'error': error, 'status': response});
				getCurrent = null;
				getNow();
			}
		});

	}

}());
