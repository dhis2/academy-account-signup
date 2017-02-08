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

Service is now available on http://localhost:8089/index.html

## Usage
The tool has two components :

* An API (localhost:8089/signup) - which takes an email address and creates DHIS 2 account invites
* A static `index.html` with a basic form that takes and email address and calls the API.

The API can be used without the static index.html page.

### Configuration
Details for the DHIS 2 instance and the user accounts that will be set up in DHIS 2 are specified in `conf/configuration.json`. There is one *default* configuration that can be used to create account invites with specific:
 
* orgunits
* user roles
* user groups

There is also one *customisation* configuration which is specific to creating of "Customisation academy" participants accounts, along with a function in `signUpServer.js` for doing the necessary configuration in DHIS. More configurations could be added as needed.

## To-do
* Returning the result of the account creating (success/failure)
* Better error handling





