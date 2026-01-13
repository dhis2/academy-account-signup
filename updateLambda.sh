#!/bin/bash

## for updating the code deployed on Lambda
## - required aws cli configured for a user with relevant privileges
zip -rq su.zip signUpLambda.js bin
aws s3 cp su.zip s3://dhis2-course-content/signup-function/su.zip
rm -rf su.zip
aws lambda update-function-code --function-name academy-signup --s3-bucket dhis2-course-content --s3-key signup-function/su.zip --publish > /tmp/academy-signup-update

## for updating the node_modules layer
#mkdir -p nodejs
#cp -r node_modules nodejs/node_modules
#zip -rq sul.zip nodejs/node_modules
#aws s3 cp sul.zip s3://dhis2-course-content/signup-function/sul.zip
#rm -rf sul.zip nodejs
#aws lambda publish-layer-version --layer-name node-dependencies --compatible-runtimes "nodejs12.x" "nodejs14.x" --content S3Bucket=dhis2-course-content,S3Key=signup-function/sul.zip > /tmp/academy-signup-update-layer
