#!/usr/bin/env node
import { App } from 'aws-cdk-lib'

import { config } from '../config'
import { ServiceStack } from '../lib/stacks/service'
import { CognitoStack } from '../lib/stacks/cognito'
import 'source-map-support/register'

const validateAppEnv = (appEnv: string | undefined) => {
  if (!appEnv || typeof appEnv !== 'string') {
    throw new Error(
      'Missing required environment variable `APP_ENV`. Please run the CDK again with it set with it set to either dev, prod etc.',
    )
  }
}

const appEnv = 'production'
validateAppEnv(appEnv)
// Automatically set `NODE_CONFIG_ENV` to the same as `APP_ENV` so that `node-config`
// will pick up the right config file.
process.env.NODE_CONFIG_ENV = appEnv
const imageTag = 'latest'

const { region, accountId, hostedZoneId, hostedZone, vpcId, ecrRepoName, email } =
  config

const constructPrefix = `${appEnv}-owna`
const app = new App({ context: { appEnv, constructPrefix } })

new ServiceStack(app, 'OwnaServiceStack', {
  stackName: `${constructPrefix}-service`,
  cognitoStackName: `${appEnv}-owna-cognito`,
  env: {
    account: accountId,
    region,
  },
  vpcId,
  hostedZone,
  hostedZoneId,
  imageTag,
  ecrRepoName,
})
