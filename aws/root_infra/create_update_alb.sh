#!/bin/sh
set -e

ENV_NAME=${1}

PROJECT_ROOT=$(dirname $(dirname $(realpath $0)))
TEMPLATE_DIR=./templates

## Default Settings
AWS_REGION=ap-southeast-2

if [[ $ENV_NAME == 'production' ]]; then
  AWS_PROFILE=soltaprod
  AWS_ACCOUNT_ID=099113283044
elif [[ $ENV_NAME == 'sandbox' ]]; then
  AWS_PROFILE=solta
  AWS_ACCOUNT_ID=044982945139
elif [[ $ENV_NAME == 'dev' ]]; then
  AWS_PROFILE=soltadev
  AWS_ACCOUNT_ID=059018563250
fi

STACK_PARAMS="ClusterStackName=${ENV_NAME}-owna-cluster \
    NetworkStackName=${ENV_NAME}-vpc"

STACK_NAME="${ENV_NAME}-owna-alb"

aws cloudformation deploy \
    --profile ${AWS_PROFILE} \
    --region ${AWS_REGION} \
    --stack-name ${STACK_NAME} \
    --template-file ${TEMPLATE_DIR}/loadbalancer.yaml \
    --capabilities CAPABILITY_NAMED_IAM \
    --parameter-overrides ${STACK_PARAMS}