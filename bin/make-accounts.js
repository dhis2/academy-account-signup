(function(){
	'use strict';

    var Q = require('q');
    var d2 = require('./d2.js');

	module.exports.makeAccounts = makeAccounts;

	var debug = true;

	//Make accounts (invites)
	//Call functions depending on type(s) of accounts to be created
	function makeAccounts(userInfo,c) {

        if (debug) console.log('makeAccounts');

		//Makes promises for account creation
		var deferred = Q.defer();
		var promises = [];

        if (debug) console.log(userInfo);
        if (debug) console.log(c);
        
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

        if (debug) console.log('makeDefaultAccount');
		d2.get("/api/users.json?filter=email:eq:" + userInfo.email, definition.server).then(function (data) {

			if (data.users.length > 0) {
				deferred.resolve({ "success": false, "message": "Account already requested. If you have not received an invitation, contact the course organiser." });
			}
			else {
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


				d2.post('/api/users/invite', invite, definition.server).then(function (data) {

					//if private group, add to private group with 
					//new user as member, and set sharing to be visible by new user only
					if (definition.privateGroup) {
						var newUserGroup = {
							"name": "User group - " + userInfo.email,
							"users": [{ "id": data.uid }],
							"sharing": {
								"owner": data.uid,
								"external": false,
								"users": {
									[data.uid]: {
										"access": "rw------",
										"id": data.uid
									}
								},
								"userGroups": {},
								"public": "--------"
							},
							"publicAccess": "--------",
							"userAccesses": [
								{
								  "access": "r-------",
								  "id": data.uid,
								  "userUid": data.uid
								}
							],
							"owner": data.uid
						}
						d2.post('/api/userGroups', newUserGroup, definition.server).then(function (data) {
							
							deferred.resolve({ "success": true, "message": "Account invitation sent to " + userInfo.email });
						},
							function (error) {
								deferred.resolve({ "success": false, "message": "Error assigning account to private user group. Contact course organiser." });
							});
					}
					else {
						deferred.resolve({ "success": true, "message": "Account invitation sent to " + userInfo.email });
					}
				},
					function (error) {
						deferred.resolve({ "success": false, "message": "Error creating account. Contact course organiser." });
					});

			}
		},
			function (error) {
				deferred.resolve({ "success": false, "message": "Error checking for existing accounts. Contact course organiser." });
			});
		return deferred.promise;

	}

	//Make account (invite) for customisation, i.e. account with a private "subtree" in the hierarchy
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
					"name": "Trainingland - " + userInfo.email,
					"shortName": "Trainingland-" + userInfo.email,
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

	//Make account (invite) for data use, i.e. account with a private "subtree" in the hierarchy, 
	//an empty data set and a user role
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
					"name": "Trainingland - " + userInfo.email,
					"shortName": "Trainingland-" + userInfo.email,
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



}());