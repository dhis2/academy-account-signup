(function(){
	var express = require('express');
	var bodyParser = require('body-parser');
	
	//Set up express app	
	var app = express();

	//Use body-parser
	app.use( bodyParser.json() );


	//Log all requests
	var logger = function(req, res, next) {
		console.log(req.method + " " + req.originalUrl);
		if (req.method === 'POST') console.log(req.body);
		next();
	}
	app.use(logger);


	//Use express for static files
	app.use(express.static('public'))
	

	//Start server on port 8089
	app.listen(8089, function () {
		console.log('Listening on port 8089!');
	});


}());