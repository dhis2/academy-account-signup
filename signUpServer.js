(function(){
	var express = require('express');
	var bodyParser = require('body-parser');
	var conf = require('./conf/configuration.json');
	var d2 = require('./bin/d2.js');


	//Create express app
	var app = express();


	//Log all requests
	var logger = function(req, res, next) {
		console.log("\n" + new Date() + '\n' + req.method + " " + req.originalUrl);
		next();
	}
	app.use(logger);


	//Use express to serve static files, i.e. the frontend registration form
	app.use(express.static('public'))


	//Use body-parser for parsing json
	app.use( bodyParser.json());


	//"API" for signing up
	app.post('/signup', function(req, res) {
		var valid = req.body.hasOwnProperty('email');
		if (!req.body.hasOwnProperty('email')) {
			res.statusCode = 400;
			return res.send('Bad request ("email" property required)');
		}

		console.log(req.body.email);

		//TODO: use Q, return result
		makeAccounts(req.body);

		res.json(true);
	});


	//Make accounts (invites)
	//Call functions depending on type(s) of accounts to be created
	function makeAccounts(userInfo) {
		//Default - user invite with roles and groups
		if (conf.inviteConfig.hasOwnProperty('default')) makeDefaultAccount(userInfo, conf.inviteConfig['default']);

		//Customisation - user invite with new dataset, user role and orgunit branch
		if (conf.inviteConfig.hasOwnProperty('customisation')) makeCustomsationAccount(userInfo, conf.inviteConfig['customisation']);

		//More as needed...


	}


	//Make account (invite) for data use, i.e. just an account with role and groups
	function makeDefaultAccount(userInfo, definition) {
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


	//Make account (invite) for data use, i.e. account with a private "subtree" in the hierarchy, an empty data set and a user role
	function makeCustomsationAccount(userInfo, definition) {

		//Make orgunit
		var today = new Date();
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

			//Make data set
			var newDataSet = {
				"name": "Data set - " + userInfo.email,
				"periodType": "Monthly",
				"categoryCombo": null,
				"mobile": true,
				"publicAccess": "--------"
			};
			d2.post('/api/dataSets', newDataSet, definition.server).then(function(data) {
				console.log("Dataset:" + data.response.uid);
				var dataSetId = data.response.uid;

				//Make user role
				var newUserRole = {
					"name": "User role - " + userInfo.email,
					"dataSets": [{"id": dataSetId}],
					"publicAccess": "--------"
				}
				d2.post('/api/userRoles', newUserRole, definition.server).then(function(data) {
					console.log("Userrole:" + data.response.uid);
					var userRoleId = data.response.uid;

					//Make user
					var invite = {
						"email": userInfo.email,
						"userCredentials": {
							"username": null,
							"userRoles": definition.roles
						},
						"userGroups": definition.groups,
						"organisationUnits": [{"id": orgunitId}]
					};
					invite.userCredentials.userRoles.push({"id": userRoleId});
					d2.post('/api/users/invite', invite, definition.server).then(function(data) {
						console.log("User:" + data.uid);
						var owner = {"user": {"id": data.uid}};

						//Now we must set owner of userRole to the new user
						d2.patch('/api/userRoles/' + userRoleId + '/user', owner, definition.server).then(function(data) {
							console.log("UserRole owner: " + data);

							//And the owner for the dataset
							d2.patch('/api/dataSets/' + dataSetId + '/user', owner, definition.server).then(function(data) {
								console.log("DataSet owner: " + data);
							});
						});


					});
				});
			});


		});
	}
	

	//Start server on port 8099
	app.listen(8099, function () {
		console.log('Listening on port 8099!');
	});


}());