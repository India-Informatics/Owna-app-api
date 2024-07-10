#!/bin/sh
set -e

ENV_NAME=${1}
PROJECT_ROOT=$(dirname $(dirname $(realpath $0)))
TEMPLATE_DIR=./templates

## Default Settings
AWS_REGION=ap-southeast-2


if [[ $ENV_NAME == 'production' ]]; then
  AWS_PROFILE=soltaprod
  HOSTED_ZONE=solta.cloud
  HOSTED_ZONE_ID=Z02239892OWA3NJNOOSVS
  AWS_ACCOUNT_ID=099113283044
elif [[ $ENV_NAME == 'sandbox' ]]; then
  AWS_PROFILE=solta
  HOSTED_ZONE=soltalabs.app
  HOSTED_ZONE_ID=ZLY1KQW4NO77Y
  AWS_ACCOUNT_ID=044982945139
elif [[ $ENV_NAME == 'dev' ]]; then
  AWS_PROFILE=soltadev
  HOSTED_ZONE=soltalabs.dev
  HOSTED_ZONE_ID=Z07663383LRAMMUNIFF4E
  AWS_ACCOUNT_ID=059018563250
fi

NETWORK_STACK_NAME=${ENV_NAME}-vpc

aws cloudformation deploy \
  --profile ${AWS_PROFILE} \
  --region ${AWS_REGION} \
  --stack-name ${ENV_NAME}-owna-cluster \
  --template-file ${TEMPLATE_DIR}/cluster.yaml \
  --parameter-overrides \
  ClusterName=${ENV_NAME}-owna \
  NetworkStackName=${NETWORK_STACK_NAME} \
  KeyAdminArn=arn:aws:iam::${AWS_ACCOUNT_ID}:root \
  HostedZoneName=${HOSTED_ZONE} \
  HostedZoneId=${HOSTED_ZONE_ID}