(function(){
	var Q = require('q');

	var conf = require('./conf/configuration.json');
	var d2 = require('./bin/d2.js');

	run();

	/**
	 * Start the server
	 */
	function run() {
		
	}


	function template() {
		var deferred = Q.defer();

		deferred.resolve(true);
				
		return deferred.promise;
	
	}

}());