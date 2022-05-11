# Academy account signup

Node.js backend to handle registration of users with data received from a basic webform.

## Setup

Requires npm and node.js.

Install dependencies:

```
$ npm install
```


## Usage

The signup tool supports three modes of use, which share most of the functional code:

### As an Amazon Lambda function

The code is maintained on Amazon Lambda, and acts as a centralised signup service. The Lambda function is exposed at the url: https://ue7emdwas56wqbk45kp3veyaeq0azyfz.lambda-url.eu-west-1.on.aws/

The function can be tested using for example curl, like this:
`curl -X POST -H "Content-Type: application/json" "https://ue7emdwas56wqbk45kp3veyaeq0azyfz.lambda-url.eu-west-1.on.aws/" -d "{\"email\": \"user@example.com\", \"url\": \"https://example.com/demo\"}"`

See `updateLambda.sh` for commands to update the Lambda function with the latest code.

> NOTE: For Lambda, the [configuration file](https://eu-west-1.console.aws.amazon.com/secretsmanager/home?region=eu-west-1#!/secret?name=academy%2Fsignup%2Fconfig) is stored in Amazon Secrets Manager. See below for more detail about configuration.

### As a service

This can be deployed to a server, or run locally for testing configurations.
Run script/backend:

```
$ node signUpServer.js
```

Service is now available on http://localhost:8099/index.html

The tool provides an API (localhost:8099/signup) which takes an email address and url, and based on this creates DHIS2 account invites.

The `misc_html` folder provides an example snippet of how the API can be used from e.g. OpenEDX.

The API can be tested using for example curl, like this:
`curl -X POST -H "Content-Type: application/json" "http://localhost:8099/signup" -d "{\"email\": \"user@example.com\", \"url\": \"https://example.com/demo\"}"`

### As a command line application

This is useful for testing configurations locally without even running the service. Simply run the function with node, passing the payload string as an argument:

```
node ./signUpFunction.js '{"email":"user@example.com","url":"https://example.com/demo"}'
```

## Configuration

Details for the DHIS 2 instance and the user accounts that will be set up in DHIS 2 are specified in `conf/configuration.json`. There is one *default* configuration that can be used to create account invites with specific:

* orgunits
* user roles
* user groups

There are also two custom configuration types available (created for customisation academies/trainings), which will add users into a new "branch" of the organisation unit hierarchy to simulate that they configure DHIS2 "from scratch" in a dedicated instance.

Any number of instances/configs can be added to the configuration file as long as the server url is unique.

## To-do

* Returning the result of the account creating (success/failure)
* Better error handling
