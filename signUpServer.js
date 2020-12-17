(function () {
	var express = require('express');
	var bodyParser = require('body-parser');
	var Q = require('q');
	var conf = require('./conf/configuration.json');
	var d2 = require('./bin/d2.js');


	//Create express app
	var app = express();


	//Log all requests
	var logger = function (req, res, next) {
		console.log("\n" + new Date() + '\n' + req.method + " " + req.originalUrl);
		next();
	}
	app.use(logger);


	//Use express to serve static files, i.e. the frontend registration form
	app.use(express.static('public'));


	//Use body-parser for parsing json
	app.use(bodyParser.json());


	//Allow cross-domain from *.dhis2academy.org //http://stackoverflow.com/questions/11001817/allow-cors-rest-request-to-a-express-node-js-application-on-heroku
	var allowCrossDomain = function (req, res, next) {

		var origin = req.get('origin');
		if (!origin) {
			next();
			return;
		}

		if (origin.indexOf('.dhis2academy.org') > 0) {
			res.header('Access-Control-Allow-Origin', origin);
		}
		else if (origin.indexOf('.dhis2.org') > 0) {
			res.header('Access-Control-Allow-Origin', origin);
		}
		else {
			res.header('Access-Control-Allow-Origin', 'dhis2.org');
		}
		res.header('Access-Control-Allow-Methods', 'POST, OPTIONS');
		res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, Content-Length, X-Requested-With, X-CSRF-Token, X-CSRFToken');


		// intercept OPTIONS method
		if ('OPTIONS' == req.method) {
			res.sendStatus(200);
		}
		else {
			next();
		}
	};
	app.use(allowCrossDomain);


	//"API" for signing up
	app.post('/signup/api', function (req, res) {
		var valid = req.body.hasOwnProperty('email') && req.body.hasOwnProperty('url');
		if (!req.body.hasOwnProperty('email')) {
			res.statusCode = 400;
			return res.send('Bad request ("email" property required)');
		}
		if (!req.body.hasOwnProperty('url')) {
			res.statusCode = 400;
			return res.send('Bad request ("url" property required)');
		}

		console.log(req.body.email);

		makeAccounts(req.body).then(function (success) {
			if (success.success) {
				res.statusCode = 201;
				return res.send(success.message);
			}
			else {
				res.statusCode = 400;
				return res.send(success.message);
			}
		});
	});


	//"API" for checking results
	app.post('/check/api', function (req, res) {
		var valid = req.body.hasOwnProperty('email');
		if (!req.body.hasOwnProperty('email')) {
			res.statusCode = 400;
			return res.send('Bad request ("email" property required)');
		}
		if (!req.body.hasOwnProperty('url')) {
			res.statusCode = 400;
			return res.send('Bad request ("url" property required)');
		}

		console.log(new Date() + " Checking " + req.body.email);

		resultForUser(req.body).then(function (success) {
			console.log(new Date() + " Result " + req.body.email + ": " + success.message);
			res.statusCode = 201;
			return res.send(success.message);
		});
	});




	//Make accounts (invites)
	//Call functions depending on type(s) of accounts to be created
	function makeAccounts(userInfo) {

		//Makes promises for account creation
		var deferred = Q.defer();
		var promises = [];

		//Get the configuration from the request 
		if (userInfo.hasOwnProperty('url') && userInfo.url) {
			var url = userInfo.url;

			//Get configuration for the requested url
			var c = getConf(url);

			//Check if the conf is "regular" or "customisation" type
			if (c.type == "default") {
				promises.push(makeDefaultAccount(userInfo, c));
			}
			else if (c.type == "customisationAggregate") {
				promises.push(makeAggregateFundamentalsAccount(userInfo, c));
			}
			else if (c.type == "customisationEvent") {
				promises.push(makeEventFundamentalsAccount(userInfo, c));
			}

		}


		//Check result of account creation, return true if all were successful
		var result = true;
		Q.all(promises).then(function (results) {
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
			"username": userInfo.email,
			"userRoles": definition.roles
		}

		//Groups
		invite.userGroups = definition.groups;

		//Orgunits
		invite.organisationUnits = definition.orgunits;

		d2.get("/api/users.json?filter=email:eq:" + userInfo.email, definition.server).then(function (data) {
			if (data.users.length > 0) {
				deferred.resolve({ "success": false, "message": "Account already requested. If you have not received an invitation, contact the course organiser." });
				console.log("Duplicate");
			}
			else {
				d2.post('/api/users/invite', invite, definition.server).then(function (data) {
					deferred.resolve({ "success": true, "message": "Account invitation sent to " + userInfo.email });
				});
			}

		});
		return deferred.promise;

	}

	//Make account (invite) for data use, i.e. account with a private "subtree" in the hierarchy
	function makeEventFundamentalsAccount(userInfo, definition) {
		var deferred = Q.defer();

		//Check for duplicate
		d2.get("/api/users.json?filter=email:eq:" + userInfo.email, definition.server).then(function (data) {

			if (data.users.length > 0) {
				deferred.resolve({ "success": false, "message": "Account already requested. If you have not received an invitation, contact the course organiser." });
			}
			else {
				//Make orgunit
				var today = new Date();
				var newRoot = {
					"name": "ROOT - " + userInfo.email,
					"shortName": "ROOT-" + userInfo.email,
					"openingDate": today.toISOString(),
					"parent": {
						"id": definition.orgunitParent
					}
				};
				d2.post('/api/organisationUnits', newRoot, definition.server).then(function (data) {
					console.log("Orgunit:" + data.response.uid);
					var orgunitId = data.response.uid;

					//Make user
					var invite = {
						"email": userInfo.email,
						"userCredentials": {
							"username": userInfo.email,
							"userRoles": JSON.parse(JSON.stringify(definition.roles))
						},
						"userGroups": JSON.parse(JSON.stringify(definition.groups)),
						"organisationUnits": [{ "id": orgunitId }]
					};
					d2.post('/api/users/invite', invite, definition.server).then(function (data) {
						console.log("DONE");
						deferred.resolve({ "success": true, "message": "Account invitation sent to " + userInfo.email });
					}, function (error) {
						deferred.resolve({ "success": false, "message": "Error configuring account. Contact course organiser." });
					});

				},
					function (error) {
						deferred.resolve({ "success": false, "message": "Error configuring account. Contact course organiser." });
					});
			}
		});

		return deferred.promise;
	}

	//Make account (invite) for data use, i.e. account with a private "subtree" in the hierarchy, an empty data set and a user role
	function makeAggregateFundamentalsAccount(userInfo, definition) {
		var deferred = Q.defer();



		//Check for duplicate
		d2.get("/api/users.json?filter=email:eq:" + userInfo.email, definition.server).then(function (data) {

			if (data.users.length > 0) {
				deferred.resolve({ "success": false, "message": "Account already requested. If you have not received an invitation, contact the course organiser." });
			}
			else {
				//Make orgunit
				var today = new Date();
				var newRoot = {
					"name": "ROOT - " + userInfo.email,
					"shortName": "ROOT-" + userInfo.email,
					"openingDate": today.toISOString(),
					"parent": {
						"id": definition.orgunitParent
					}
				};
				d2.post('/api/organisationUnits', newRoot, definition.server).then(function (data) {
					console.log("Orgunit:" + data.response.uid);
					var orgunitId = data.response.uid;

					//Make data set - categoryCombo required only for 2.25, hardcoded here
					var newDataSet = {
						"name": "Data set - " + userInfo.email,
						"periodType": "Monthly",
						"categoryCombo": { "id": "bjDvmb4bfuf" },
						"mobile": true,
						"publicAccess": "--------"
					};
					d2.post('/api/dataSets', newDataSet, definition.server).then(function (data) {
						console.log("Dataset:" + data.response.uid);
						var dataSetId = data.response.uid;

						//Make user role
						var newUserRole = {
							"name": "User role - " + userInfo.email,
							"dataSets": [{ "id": dataSetId }],
							"publicAccess": "--------"
						}
						d2.post('/api/userRoles', newUserRole, definition.server).then(function (data) {
							console.log("Userrole:" + data.response.uid);
							var userRoleId = data.response.uid;

							//Make user
							var invite = {
								"email": userInfo.email,
								"userCredentials": {
									"username": userInfo.email,
									"userRoles": JSON.parse(JSON.stringify(definition.roles))
								},
								"userGroups": JSON.parse(JSON.stringify(definition.groups)),
								"organisationUnits": [{ "id": orgunitId }]
							};
							invite.userCredentials.userRoles.push({ "id": userRoleId });
							d2.post('/api/users/invite', invite, definition.server).then(function (data) {
								console.log("User:" + data.uid);
								var owner = { "id": data.uid };

								//Now we must set owner of userRole to the new user
								d2.get('/api/userRoles/' + userRoleId + '.json?fields=:owner', definition.server).then(function (data) {

									data.user = owner;
									d2.put('/api/userRoles/' + userRoleId, data, definition.server).then(function (data) {

										//Now we must set owner of dataSet to the new user
										d2.get('/api/dataSets/' + dataSetId + '.json?fields=:owner', definition.server).then(function (data) {

											data.user = owner;
											d2.put('/api/dataSets/' + dataSetId, data, definition.server).then(function (data) {
												console.log("DONE");
												deferred.resolve({ "success": true, "message": "Account invitation sent to " + userInfo.email });
											}, function (error) {
												deferred.resolve({ "success": false, "message": "Error configuring account. Contact course organiser." });
											});
										}, function (error) {
											deferred.resolve({ "success": false, "message": "Error configuring account. Contact course organiser." });
										});
									}, function (error) {
										deferred.resolve({ "success": false, "message": "Error configuring account. Contact course organiser." });
									});
								}, function (error) {
									deferred.resolve({ "success": false, "message": "Error configuring account. Contact course organiser." });
								});
							}, function (error) {
								deferred.resolve({ "success": false, "message": "Error configuring account. Contact course organiser." });
							});
						}, function (error) {
							deferred.resolve({ "success": false, "message": "Error configuring account. Contact course organiser." });
						});
					}, function (error) {
						deferred.resolve({ "success": false, "message": "Error configuring account. Contact course organiser." });
					});
				});
			}
		});

		return deferred.promise;
	}


	//Check results
	function resultForUser(userInfo) {

		//Makes promises for account creation
		var deferred = Q.defer();
		var promises = [];
		var config;
		
		//Get the configuration from the request 
		if (userInfo.hasOwnProperty('url') && userInfo.url) {
			var url = userInfo.url;

			//Get configuration for the requested url
			config = getConfType(url, 'result');

		}
	
		var assignment = userInfo.assignment ? userInfo.assignment : false;
		if (assignment) {
			switch (assignment) {
				case 1:
					promises.push(resultCustomisation(userInfo.email, config));
				//More as needed...
			}
		}

		//Check result of account creation, return true if all were successful
		var result = true;
		Q.all(promises).then(function (results) {
			for (var i = 0; i < results.length; i++) {
				result = result && results[i];
			}

			deferred.resolve(result);
		})


		return deferred.promise;

	}

	//Check result of customisation exercise
	function resultCustomisation(email, definition) {
		var deferred = Q.defer();

		//Check for duplicate
		d2.get("/api/users.json?filter=email:eq:" + email + '&fields=created,organisationUnits[level,children,id]&paging=false', definition.server).then(function (data) {

			if (data.users.length === 0) {
				deferred.resolve({ "success": false, "message": "Account with email " + email + " not found." });
				return;
			}


			//Get oldest (first created) user
			var currentUser = data.users[0];
			for (var i = 1; i < data.users.length; i++) {
				if (currentUser.created > data.users[i].created) currentUser = data.users[i];
			}

			var currentOrgunit = currentUser.organisationUnits[0];
			for (var i = 1; i < currentUser.organisationUnits.length; i++) {
				if (currentOrgunit.level > currentUser.organisationUnits[i].level) currentOrgunit = currentUser.organisationUnits[i];
			}

			//User have not created a new orgunit (child)
			if (currentOrgunit.children.length === 0) {
				deferred.resolve({ "success": false, "message": "No orgunits have been created." });
				return;
			}

			//Get all orgunits and children below the "root" orgunit
			d2.get("/api/organisationUnits.json?filter=path:like:" + currentOrgunit.id + "/&fields=[name,id,dataSets]&paging=false", definition.server).then(function (data) {

				var dataSetExists = {};

				var dataSetIds = [];
				var orgunitIds = [];
				for (var i = 0; i < data.organisationUnits.length; i++) {
					var ou = data.organisationUnits[i];
					orgunitIds.push(ou.id);
					for (var j = 0; j < ou.dataSets.length; j++) {
						if (!dataSetExists[ou.dataSets[j].id]) {
							dataSetExists[ou.dataSets[j].id]
							dataSetIds.push(ou.dataSets[j].id);
						}
					}
				}

				if (dataSetIds.length < 1) {
					deferred.resolve({ "success": false, "message": "No data set assigned to orgunit children." });
					return;
				}

				var url = '/api/dataValueSets.json?startDate=2000-01-01&endDate=2025-01-01';
				url += '&dataSet=' + dataSetIds.join('&dataSet=');
				url += '&orgUnit=' + orgunitIds.join('&orgUnit=');

				d2.get(url, definition.server).then(function (data) {
					if (data && data.dataValues && data.dataValues.length > 0) {
						deferred.resolve({ "success": true, "message": "Result OK" });
					}
					else {
						deferred.resolve({ "success": false, "message": "No data values." });
					}
				});
			});
		});

		return deferred.promise;
	}


	//Start server on port 8099
	app.listen(8099, function () {
		console.log('Listening on port 8099!');
	});


	//Get configuration based on url
	function getConf(url) {
		for (var i = 0; i < conf.inviteConfigs.length; i++) {
			if (conf.inviteConfigs[i].server.url == url) return conf.inviteConfigs[i];
		}

		return false;
	}
	
	//Get configuration based on url and type
	function getConfType(url, type) {
		for (var i = 0; i < conf.inviteConfigs.length; i++) {
			if (conf.inviteConfigs[i].server.url == url && conf.inviteConfigs[i].type == type) return conf.inviteConfigs[i];
		}

		return false;
	}

}());
