(function(){
	var express = require('express');
	var bodyParser = require('body-parser');
	var Q = require('q');
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
	app.use(express.static('public'));


	//Use body-parser for parsing json
	app.use( bodyParser.json());


	//"API" for signing up
	app.post('/signup/api', function(req, res) {
		var valid = req.body.hasOwnProperty('email');
		if (!req.body.hasOwnProperty('email')) {
			res.statusCode = 400;
			return res.send('Bad request ("email" property required)');
		}

		console.log(req.body.email);

		makeAccounts(req.body).then(function(success) {
			if (success) {
				res.statusCode = 201;
				return res.send({"result": "Created"});
			}
			else {
				res.statusCode = 400;
				return res.send({"result": "Error creating account(s)"});
			}
		});
	});


	//Make accounts (invites)
	//Call functions depending on type(s) of accounts to be created
	function makeAccounts(userInfo) {

		//Makes promises for account creation
		var deferred = Q.defer();
		var promises = [];

		//Default - user invite with roles and groups
		if (conf.inviteConfig.hasOwnProperty('default')) {
			promises.push(makeDefaultAccount(userInfo, conf.inviteConfig['default']));
		}

		//Customisation - user invite with new dataset, user role and orgunit branch
		if (conf.inviteConfig.hasOwnProperty('customisation')) {
			promises.push(makeCustomsationAccount(userInfo, conf.inviteConfig['customisation']));
		}

		//More as needed...


		//Check result of account creation, return true if all were successful
		var result = true;
		Q.all(promises).then(function(results) {
			for (var i = 0; i < results.length; i++) {
				result = result && results[i];
			}

			deferred.resolve(result);
		})


		return deferred.promise;

	}


	//Make account (invite) for data use, i.e. just an account with role and groups
	function makeDefaultAccount(userInfo, definition) {
		var deferred = Q.defer();
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

		d2.post('/api/users/invite', invite, definition.server).then(function(data) {
			deferred.resolve(true);
		});
		return deferred.promise;

	}


	//Make account (invite) for data use, i.e. account with a private "subtree" in the hierarchy, an empty data set and a user role
	function makeCustomsationAccount(userInfo, definition) {
		var deferred = Q.defer();


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

			//Make data set - categoryCombo required only for 2.25, hardcoded here
			var newDataSet = {
				"name": "Data set - " + userInfo.email,
				"periodType": "Monthly",
				"categoryCombo": {"id": "bjDvmb4bfuf"},
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
				d2.post('/api/userRoles', newUserRole, definition.server).then(function (data) {
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
					d2.post('/api/users/invite', invite, definition.server).then(function (data) {
						console.log("User:" + data.uid);
						var owner = {"id": data.uid};

						//Now we must set owner of userRole to the new user
						d2.get('/api/userRoles/' + userRoleId + '.json?fields=:owner', definition.server).then(function (data) {

							data.user = owner;
							d2.put('/api/userRoles/' + userRoleId, data, definition.server).then(function (data) {

								//Now we must set owner of userRole to the new user
								d2.get('/api/dataSets/' + dataSetId + '.json?fields=:owner', definition.server).then(function (data) {

									data.user = owner;
									d2.put('/api/dataSets/' + dataSetId, data, definition.server).then(function (data) {
										console.log("DONE");
										deferred.resolve(true);
									}, function(error) {
										deferred.resolve(false);
								}, function(error) {
									deferred.resolve(false);
									});
							}, function(error) {
								deferred.resolve(false);
								});
						}, function(error) {
							deferred.resolve(false);
							});
					}, function(error) {
						deferred.resolve(false);
						});
				}, function(error) {
					deferred.resolve(false);
					});
			}, function(error) {
				deferred.resolve(false);
				});
		}, function(error) {
			deferred.resolve(false);
			});
		});

		return deferred.promise;
	}
	

	//Start server on port 8099
	app.listen(8099, function () {
		console.log('Listening on port 8099!');
	});


}());
