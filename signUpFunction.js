// var bodyParser = require('body-parser');
// var Q = require('q');
var maka = require('./bin/make-accounts.js');
var confParser = require('./bin/localConfig.js');


// 
var req = JSON.parse(process.argv[2]);
console.log("request: ");
console.log(req);

if (!req.hasOwnProperty('email')) {
    console.log('Bad request ("email" property required)');
    process.exit(1);
}
if (!req.hasOwnProperty('url')) {
    console.log('Bad request ("url" property required)');
    process.exit(1);
}

c = confParser.getConfig(req.url);
if (c) {
    maka.makeAccounts(req,c).then(function (response) {
        if (response.success) {
            console.log(response.message);
        }
        else {
            console.log(response.message);
        }
    })
}
else {
    console.log('Bad request (requested instance "url" not configured)');
    process.exit(1);

}

