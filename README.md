# Academy account signup
Node.js backend to handle registration of users with data received from a basic webform.

## Setup
Requires npm and node.js. 

Install dependencies:

```
$ npm install
```

Run script/backend:

```
$ node signUpServer.js
```

Service is now available on http://localhost:8099/index.html

## Usage
The tool provides an API (localhost:8099/signup) which takes an email address and url, and based on this creates DHIS2 account invites.

The `misc_html` folder provides an example snippet of how the API can be used from e.g. OpenEDX.

The API can be tested using for example curl, like this:
`curl -X POST -H "Content-Type: application/json" "http://localhost:8099/signup" -d "{\"email\": \"user@example.com\", \"url\": \"https://example.com/demo\"}"`

### Configuration
Details for the DHIS 2 instance and the user accounts that will be set up in DHIS 2 are specified in `conf/configuration.json`. There is one *default* configuration that can be used to create account invites with specific:
 
* orgunits
* user roles
* user groups

There are also two custom configuration types available (created for customisation academies/trainings), which will add users into a new "branch" of the organisation unit hierarchy to simulate that they configure DHIS2 "from scratch" in a dedicated instance.

Any number of instances/configs can be added to the configuration file as long as the server url is unique.

## To-do
* Returning the result of the account creating (success/failure)
* Better error handling





