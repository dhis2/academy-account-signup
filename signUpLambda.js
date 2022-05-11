exports.handler = async (event) => {

    var status = 200;
    var bod = "";

    var req = JSON.parse(event.body);

    if (req.hasOwnProperty('email') && req.hasOwnProperty('url')) {
        bod = req.url;
    }
    else {
        status = 400;
        bod = 'Bad request. ';
        if (!req.hasOwnProperty('email')) {
            bod += '("email" property required)';
        }
        if (!req.hasOwnProperty('url')) {
            bod += '("url" property required)';
        }
        // TODO implement
        const response = {
            statusCode: status,
            body: bod,
        };
        return response;
    }

    const lambdaConfig = require('./bin/lambdaConfig.js');
    var c = await lambdaConfig.getConfig(req.url);


    if (c) {

        var maka = require('./bin/make-accounts.js');
        await maka.makeAccounts(req, c).then(function(response) {
            if (response.success) {
                status = 201;
                bod = response.message;
            }
            else {
                status = 400;
                bod = response.message;
            }
        })
    }
    else {
        status = 400;
        bod = 'Bad request (requested instance "url" not configured)';
    }




    // TODO implement
    const response = {
        statusCode: status,
        body: bod,
    };
    return response;
};
