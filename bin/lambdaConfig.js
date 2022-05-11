'use strict'
const AWS = require('aws-sdk');
class lambdaConfig {
    /**
     * Uses AWS Secrets Manager to retrieve a secret
     */
    static async getConfig(url) {

        var region = process.env.SIGNUP_REGION;
        var secretName = process.env.SIGNUP_CONFIG;
        const config = { region: region }

        let secretsManager = new AWS.SecretsManager(config);
        try {
            let secretValue = await secretsManager.getSecretValue({ SecretId: secretName }).promise();
            if ('SecretString' in secretValue) {
                var conf = JSON.parse(secretValue.SecretString);
                for (var i = 0; i < conf.inviteConfigs.length; i++) {
                    if (conf.inviteConfigs[i].server.url == url) return conf.inviteConfigs[i];
                }
            }
            else {
                return false;
            }
        }
        catch (err) {
            console.log("error: " + err);
            if (err.code === 'DecryptionFailureException')
                // Secrets Manager can't decrypt the protected secret text using the provided KMS key.
                // Deal with the exception here, and/or rethrow at your discretion.
                throw err;
            else if (err.code === 'InternalServiceErrorException')
                // An error occurred on the server side.
                // Deal with the exception here, and/or rethrow at your discretion.
                throw err;
            else if (err.code === 'InvalidParameterException')
                // You provided an invalid value for a parameter.
                // Deal with the exception here, and/or rethrow at your discretion.
                throw err;
            else if (err.code === 'InvalidRequestException')
                // You provided a parameter value that is not valid for the current state of the resource.
                // Deal with the exception here, and/or rethrow at your discretion.
                throw err;
            else if (err.code === 'ResourceNotFoundException')
                // We can't find the resource that you asked for.
                // Deal with the exception here, and/or rethrow at your discretion.
                throw err;
        }
    }
}
module.exports = lambdaConfig;
