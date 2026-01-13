(function () {
	var express = require('express');
	var bodyParser = require('body-parser');
	var maka = require('./bin/make-accounts.js');
	var confParser = require('./bin/localConfig.js');


	//Create express app
	var app = express();


	//Log all requests
	var logger = function (req, res, next) {
		console.log("\n" + new Date() + '\n' + req.method + " " + req.originalUrl);
		next();
	}
	app.use(logger);

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
	app.post('/signup', function (req, res) {
		//var valid = req.body.hasOwnProperty('email') && req.body.hasOwnProperty('url');
		if (!req.body.hasOwnProperty('email')) {
			res.statusCode = 400;
			return res.send('Bad request ("email" property required)');
		}
		if (!req.body.hasOwnProperty('url')) {
			res.statusCode = 400;
			return res.send('Bad request ("url" property required)');
		}

		// console.log(req.body.email);
		c = confParser.getConfig(req.body.url);

		if (c) {
			maka.makeAccounts(req.body,c).then(function (response) {
				if (response.success) {
					res.statusCode = 201;
					return res.send(response.message);
				}
				else {
					res.statusCode = 400;
					return res.send(response.message);
				}
			})
		}
		else {
			res.statusCode = 400;
			return res.send('Bad request (requested instance "url" not configured)');
		}



	});


	//Start server on port 8099
	app.listen(8099, function () {
		console.log('Listening on port 8099!');
	});


}());
