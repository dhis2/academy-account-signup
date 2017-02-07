(function(){
	var express = require('express');
	var bodyParser = require('body-parser');
	var conf = require('./conf/configuration.json');
	var d2 = require('./bin/d2.js');

	//Set up express app	
	var app = express();


	//Log all requests
	var logger = function(req, res, next) {
		console.log(req.method + " " + req.originalUrl);
		next();
	}
	app.use(logger);


	//Use express for static files
	app.use(express.static('public'))


	//Use body-parser
	app.use( bodyParser.json());


	//"API" for signing up
	app.post('/signup', function(req, res) {
		var valid = req.body.hasOwnProperty('email');
		if (!req.body.hasOwnProperty('email')) {
			res.statusCode = 400;
			return res.send('Invalid syntax');
		}

		console.log(req.body.email);

		//TODO: should use Q, return result
		makeAccounts(req.body);

		res.json(true);
	});


	function makeAccounts(userInfo) {

		if (conf.inviteConfig.hasOwnProperty('customisation')) makeCustomsationAccount(userInfo, conf.inviteConfig['customisation']);
		//if (conf.inviteConfig.hasOwnProperty('use')) makeUseAccount(userInfo, conf.inviteConfig['use']);
	}

	function makeUseAccount(userInfo, definition) {
		var invite = {};

		//Email
		invite.email = userInfo.email;

		//Roles
		invite.userCredentials = {
			"username": null,
			"userRoles": definition.roles
		}

		//Groups
		invite.userGroups = definition.groups;

		//Orgunits
		invite.organisationUnits = definition.orgunits;

		d2.post('/api/users/invite', invite, definition.server);

	}

	function makeCustomsationAccount(userInfo, definition) {
		var invite = {};

		var today = new Date();

		//Make orgunit
		var newRoot = {
			"name": "ROOT - " + userInfo.email,
			"shortName": "ROOT-" + userInfo.email,
			"openingDate": today.getFullYear() + "-" + today.getMonth() + "-" + today.getDate(),
			"parent": {
				"id": definition.orgunitParent
			}
		};
		d2.post('/api/organisationUnits', newRoot, definition.server).then(function(data) {
			console.log("Orgunit:" + data.response.uid);
			var orgunitId = data.response.uid;

			var newDataSet = {
				"name": "Data set - " + userInfo.email,
				"periodType": "Monthly",
				"categoryCombo": null,
				"mobile": true,
			};

			d2.post('/api/dataSets', newDataSet, definition.server).then(function(data) {
				console.log("Dataset:" + data.response.uid);
				var dataSetId = data.response.uid;

				var newUserRole = {
					"name": "User role - " + userInfo.email,
					"dataSets": [{"id": dataSetId}]
				}

				d2.post('/api/userRoles', newUserRole, definition.server).then(function(data) {
					console.log("Userrole:" + data.response.uid);
					var userRoleId = data.response.uid;

					var invite = {}
					//Email
					invite.email = userInfo.email;

					//Roles
					invite.userCredentials = {
						"username": null,
						"userRoles": definition.roles
					}
					invite.userCredentials.userRoles.push({"id": userRoleId});

					//Groups
					invite.userGroups = definition.groups;

					//Orgunits
					invite.organisationUnits = [{"id": orgunitId}];

					d2.post('/api/users/invite', invite, definition.server).then(function(data) {
						console.log("User:" + data.uid);
					});
				});
			});


		});


		return;

		//Email
		invite.email = userInfo.email;

		//Roles
		invite.userCredentials = {
			"username": null,
			"userRoles": definition.roles
		}

		//Groups
		invite.userGroups = definition.groups;

		//Orgunits
		invite.organisationUnits = definition.orgunits;

		d2.post('/api/users/invite', invite, definition.server);

	}
	

	//Start server on port 8089
	app.listen(8089, function () {
		console.log('Listening on port 8089!');
	});


}());