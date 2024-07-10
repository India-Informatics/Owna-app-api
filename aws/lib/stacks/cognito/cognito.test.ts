import { App } from 'aws-cdk-lib'
import { Template, Match, Capture } from 'aws-cdk-lib/assertions'
import {
  CfnUserPool,
  CfnUserPoolDomain,
  Mfa,
  UserPool,
  CfnUserPoolClient,
  UserPoolClientIdentityProvider,
  OAuthScope,
  UserPoolClient,
  CfnUserPoolResourceServer,
} from 'aws-cdk-lib/aws-cognito'
import { Effect, CfnRole, Role } from 'aws-cdk-lib/aws-iam'

import { config } from '../../../common/config'
import * as CDKTestUtils from '../../../solta-cdk'

import { CognitoStack } from './cognito'

const appEnv = process.env.APP_ENV as string
const constructPrefix = `${appEnv}-midas`
const { accountId, region, email, cognito, identityServiceUrl } = config
const { signInCallbackUrl } = cognito

const createTemplate = CDKTestUtils.getTemplateGenerator(({ appEnv }) => {
  const app = new App({ context: { appEnv, constructPrefix } })
  const stack = new CognitoStack(app, 'CognitoStack', {
    stackName: 'test-midas-cognito',
    env: { account: accountId, region },
    email,
    signInCallbackUrl,
    identityServiceUrl,
  })
  const template = Template.fromStack(stack)

  return { stack, template }
})

describe('CognitoStack', () => {
  test('Synthesis snapshot', () => {
    const { template } = createTemplate()

    expect(template.toJSON()).toMatchSnapshot()
  })

  test('Creates an SNS Role', () => {
    const { template } = createTemplate()

    template.hasResourceProperties(CfnRole.CFN_RESOURCE_TYPE_NAME, {})
  })

  test('Creates a User Pool', () => {
    const { template } = createTemplate()

    template.hasResourceProperties(CfnUserPool.CFN_RESOURCE_TYPE_NAME, {})
  })

  test('Creates a User Pool Domain', () => {
    const { template } = createTemplate()

    template.hasResourceProperties(CfnUserPoolDomain.CFN_RESOURCE_TYPE_NAME, {})
  })

  test('Creates an Auth App User Pool Client', () => {
    const { template } = createTemplate()

    template.hasResourceProperties(CfnUserPoolClient.CFN_RESOURCE_TYPE_NAME, {
      ClientName: `${constructPrefix}-auth-app-client`,
    })
  })

  test('Creates an Identity Service User Pool Client', () => {
    const { template } = createTemplate()

    template.hasResourceProperties(CfnUserPoolClient.CFN_RESOURCE_TYPE_NAME, {
      ClientName: `${constructPrefix}-identity-service-client`,
    })
  })

  test('Creates an Merchant Wallet App User Pool Client', () => {
    const { template } = createTemplate()

    template.hasResourceProperties(CfnUserPoolClient.CFN_RESOURCE_TYPE_NAME, {
      ClientName: `${constructPrefix}-merchant-wallet-app-client`,
    })
  })

  test('Creates an Identity Service User Pool Resource Server', () => {
    const { template } = createTemplate()

    template.hasResourceProperties(CfnUserPoolResourceServer.CFN_RESOURCE_TYPE_NAME, {
      Name: 'Identity Service',
    })
  })

  test('Exports `UserPoolId` output', () => {
    const { stack, template } = createTemplate()

    template.hasOutput('UserPoolIdOutput', {
      Value: Match.anyValue(),
      Export: {
        Name: `${stack.stackName}-UserPoolId`,
      },
    })
  })

  test('Exports `UserPoolArn` output', () => {
    const { stack, template } = createTemplate()

    template.hasOutput('UserPoolArnOutput', {
      Value: Match.anyValue(),
      Export: {
        Name: `${stack.stackName}-UserPoolArn`,
      },
    })
  })

  test('Exports `UserPoolDomain` output', () => {
    const { stack, template } = createTemplate()

    template.hasOutput('UserPoolDomainOutput', {
      Value: Match.anyValue(),
      Export: {
        Name: `${stack.stackName}-UserPoolDomain`,
      },
    })
  })

  test('Exports `AuthAppUserPoolClientId` output', () => {
    const { stack, template } = createTemplate()

    const client = stack.node.findChild('AuthAppUserPoolClient') as UserPoolClient

    template.hasOutput('AuthAppUserPoolClientIdOutput', {
      Value: {
        Ref: CDKTestUtils.getLogicalId(client),
      },
      Export: {
        Name: `${stack.stackName}-AuthAppUserPoolClientId`,
      },
    })
  })

  test('Exports `IdentityServiceUserPoolClientId` output', () => {
    const { stack, template } = createTemplate()

    const client = stack.node.findChild(
      'IdentityServiceUserPoolClient'
    ) as UserPoolClient

    template.hasOutput('IdentityServiceUserPoolClientIdOutput', {
      Value: {
        Ref: CDKTestUtils.getLogicalId(client),
      },
      Export: {
        Name: `${stack.stackName}-IdentityServiceUserPoolClientId`,
      },
    })
  })

  test('Exports `MerchantWalletAppUserPoolClientId` output', () => {
    const { stack, template } = createTemplate()

    const client = stack.node.findChild(
      'MerchantWalletAppUserPoolClient'
    ) as UserPoolClient

    template.hasOutput('MerchantWalletAppUserPoolClientIdOutput', {
      Value: {
        Ref: CDKTestUtils.getLogicalId(client),
      },
      Export: {
        Name: `${stack.stackName}-MerchantWalletAppUserPoolClientId`,
      },
    })
  })
})

describe('CognitoStack.CognitoSNSRole', () => {
  test('Allows Cognito service principals to assume this role', () => {
    const { template } = createTemplate()

    template.hasResourceProperties(CfnRole.CFN_RESOURCE_TYPE_NAME, {
      AssumeRolePolicyDocument: {
        Statement: [
          {
            Action: 'sts:AssumeRole',
            Effect: Effect.ALLOW,
            Principal: {
              Service: 'cognito-idp.amazonaws.com',
            },
          },
        ],
      },
    })
  })

  test('Allows principals to publish to SNS with this role', () => {
    const { template } = createTemplate()

    template.hasResourceProperties(CfnRole.CFN_RESOURCE_TYPE_NAME, {
      Policies: [
        {
          PolicyName: 'CognitoSNSPolicy',
          // The `Template` assertion tool by default matches with `Match.objectLike()`,
          // but it seems to break when it drills down to this particular property.
          // Wrapping `PolicyDocument` with `Match.objectLike()` restores expected
          // behavior, even if it seems a little redundant.
          PolicyDocument: Match.objectLike({
            Statement: [
              {
                Action: 'sns:publish',
                Effect: 'Allow',
                Resource: '*',
              },
            ],
          }),
        },
      ],
    })
  })
})

describe('CognitoStack.UserPool', () => {
  test('Auto-verifies e-mail and phone number on sign-in', () => {
    const { template } = createTemplate()

    template.hasResourceProperties(CfnUserPool.CFN_RESOURCE_TYPE_NAME, {
      AutoVerifiedAttributes: ['email', 'phone_number'],
    })
  })

  test('Allows MFA optionally', () => {
    const { template } = createTemplate()

    template.hasResourceProperties(CfnUserPool.CFN_RESOURCE_TYPE_NAME, {
      MfaConfiguration: Mfa.OPTIONAL,
    })
  })

  test('Allows OTP and SMS MFA second factors', () => {
    const { template } = createTemplate()

    template.hasResourceProperties(CfnUserPool.CFN_RESOURCE_TYPE_NAME, {
      EnabledMfas: ['SMS_MFA', 'SOFTWARE_TOKEN_MFA'],
    })
  })

  test('Assume Cognito SNS Role when sending SMS messages', () => {
    const { stack, template } = createTemplate()

    const cognitoSnsRole = stack.node.findChild('CognitoSNSRole') as Role

    const snsLogicalIdCapture = new Capture()

    template.hasResourceProperties(CfnUserPool.CFN_RESOURCE_TYPE_NAME, {
      SmsConfiguration: {
        SnsCallerArn: {
          'Fn::GetAtt': [snsLogicalIdCapture, 'Arn'],
        },
      },
    })

    expect(snsLogicalIdCapture.asString()).toBe(
      CDKTestUtils.getLogicalId(cognitoSnsRole)
    )
  })

  test('Allows sign-in via e-mail only', () => {
    const { template } = createTemplate()

    template.hasResourceProperties(CfnUserPool.CFN_RESOURCE_TYPE_NAME, {
      UsernameAttributes: ['email'],
    })
  })

  test('E-mail sign-in is case insensitive', () => {
    const { template } = createTemplate()

    template.hasResourceProperties(CfnUserPool.CFN_RESOURCE_TYPE_NAME, {
      UsernameConfiguration: {
        CaseSensitive: false,
      },
    })
  })

  test(`Sends e-mails from \`${email.sendFrom}\``, () => {
    const { template } = createTemplate()

    const emailFromCapture = new Capture()

    template.hasResourceProperties(CfnUserPool.CFN_RESOURCE_TYPE_NAME, {
      EmailConfiguration: {
        From: emailFromCapture,
        ReplyToEmailAddress: email.sendFrom,
      },
    })

    expect(emailFromCapture.asString()).toMatch(email.sendFrom)
  })

  test(`Sends e-mails using the name \`${email.sendFromName}\``, () => {
    const { template } = createTemplate()

    const emailFromCapture = new Capture()

    template.hasResourceProperties(CfnUserPool.CFN_RESOURCE_TYPE_NAME, {
      EmailConfiguration: {
        From: emailFromCapture,
      },
    })

    expect(emailFromCapture.asString()).toMatch(email.sendFromName)
  })

  test('Requires challenge on new device after sign-in', () => {
    const { template } = createTemplate()

    template.hasResourceProperties(CfnUserPool.CFN_RESOURCE_TYPE_NAME, {
      DeviceConfiguration: {
        ChallengeRequiredOnNewDevice: true,
      },
    })
  })

  test('Allows users to opt-in to remembering their device', () => {
    const { template } = createTemplate()

    template.hasResourceProperties(CfnUserPool.CFN_RESOURCE_TYPE_NAME, {
      DeviceConfiguration: {
        DeviceOnlyRememberedOnUserPrompt: true,
      },
    })
  })

  test('Password policy requires at least 8 characters', () => {
    const { template } = createTemplate()

    template.hasResourceProperties(CfnUserPool.CFN_RESOURCE_TYPE_NAME, {
      Policies: {
        PasswordPolicy: {
          MinimumLength: 8,
        },
      },
    })
  })

  test('Password policy requires at least one lowercase letter', () => {
    const { template } = createTemplate()

    template.hasResourceProperties(CfnUserPool.CFN_RESOURCE_TYPE_NAME, {
      Policies: {
        PasswordPolicy: {
          RequireLowercase: true,
        },
      },
    })
  })

  test('Password policy requires at least one uppercase character', () => {
    const { template } = createTemplate()

    template.hasResourceProperties(CfnUserPool.CFN_RESOURCE_TYPE_NAME, {
      Policies: {
        PasswordPolicy: {
          RequireUppercase: true,
        },
      },
    })
  })

  test('Password policy requires at least one digit', () => {
    const { template } = createTemplate()

    template.hasResourceProperties(CfnUserPool.CFN_RESOURCE_TYPE_NAME, {
      Policies: {
        PasswordPolicy: {
          RequireNumbers: true,
        },
      },
    })
  })

  test('Password policy does not require symbols', () => {
    const { template } = createTemplate()

    template.hasResourceProperties(CfnUserPool.CFN_RESOURCE_TYPE_NAME, {
      Policies: {
        PasswordPolicy: {
          RequireSymbols: false,
        },
      },
    })
  })

  test('Temporary passwords are valid for two days', () => {
    const { template } = createTemplate()

    template.hasResourceProperties(CfnUserPool.CFN_RESOURCE_TYPE_NAME, {
      Policies: {
        PasswordPolicy: {
          TemporaryPasswordValidityDays: 2,
        },
      },
    })
  })

  test('Allows account recovery via e-mail and phone number (if not used for MFA)', () => {
    const { template } = createTemplate()

    template.hasResourceProperties(CfnUserPool.CFN_RESOURCE_TYPE_NAME, {
      AccountRecoverySetting: {
        RecoveryMechanisms: [
          { Name: 'verified_email', Priority: 1 },
          { Name: 'verified_phone_number', Priority: 2 },
        ],
      },
    })
  })

  test('Enables the `name` standard attribute', () => {
    const { template } = createTemplate()

    template.hasResourceProperties(CfnUserPool.CFN_RESOURCE_TYPE_NAME, {
      Schema: Match.arrayWith([
        {
          Name: 'name',
          Mutable: true,
          Required: true,
        },
      ]),
    })
  })

  test('Enables the `phone_number` standard attribute', () => {
    const { template } = createTemplate()

    template.hasResourceProperties(CfnUserPool.CFN_RESOURCE_TYPE_NAME, {
      Schema: Match.arrayWith([
        {
          Name: 'phone_number',
          Mutable: false,
          Required: false,
        },
      ]),
    })
  })

  test('Enables the `email` standard attribute', () => {
    const { template } = createTemplate()

    template.hasResourceProperties(CfnUserPool.CFN_RESOURCE_TYPE_NAME, {
      Schema: Match.arrayWith([
        {
          Name: 'email',
          Mutable: true,
          Required: true,
        },
      ]),
    })
  })
})

describe('CognitoStack.UserPoolDomain', () => {
  test('References the correct User Pool', () => {
    const { stack, template } = createTemplate()

    const userPool = stack.node.findChild('UserPool') as UserPool
    const userPoolLogicalIdCapture = new Capture()

    template.hasResourceProperties(CfnUserPoolDomain.CFN_RESOURCE_TYPE_NAME, {
      UserPoolId: {
        Ref: userPoolLogicalIdCapture,
      },
    })

    expect(userPoolLogicalIdCapture.asString()).toBe(
      CDKTestUtils.getLogicalId(userPool)
    )
  })

  test('Prefixed matches the construct prefix', () => {
    const { template } = createTemplate()

    template.hasResourceProperties(CfnUserPoolDomain.CFN_RESOURCE_TYPE_NAME, {
      Domain: constructPrefix,
    })
  })
})

describe('CognitoStack.AuthAppUserPoolClient', () => {
  test('References the correct User Pool', () => {
    const { stack, template } = createTemplate()

    const userPool = stack.node.findChild('UserPool') as UserPool

    template.hasResourceProperties(CfnUserPoolClient.CFN_RESOURCE_TYPE_NAME, {
      ClientName: `${constructPrefix}-auth-app-client`,
      UserPoolId: {
        Ref: CDKTestUtils.getLogicalId(userPool),
      },
    })
  })

  test('Supports `Cognito` as an identity provider', () => {
    const { template } = createTemplate()

    template.hasResourceProperties(CfnUserPoolClient.CFN_RESOURCE_TYPE_NAME, {
      ClientName: `${constructPrefix}-auth-app-client`,
      SupportedIdentityProviders: [UserPoolClientIdentityProvider.COGNITO.name],
    })
  })

  test('Prevents user existence errors from being thrown', () => {
    const { template } = createTemplate()

    template.hasResourceProperties(CfnUserPoolClient.CFN_RESOURCE_TYPE_NAME, {
      ClientName: `${constructPrefix}-auth-app-client`,
      PreventUserExistenceErrors: 'ENABLED',
    })
  })

  test('Does not generate an app secret', () => {
    const { template } = createTemplate()

    template.hasResourceProperties(CfnUserPoolClient.CFN_RESOURCE_TYPE_NAME, {
      ClientName: `${constructPrefix}-auth-app-client`,
      GenerateSecret: false,
    })
  })

  test('Allows authorization code grant OAuth flows', () => {
    const { template } = createTemplate()

    template.hasResourceProperties(CfnUserPoolClient.CFN_RESOURCE_TYPE_NAME, {
      ClientName: `${constructPrefix}-auth-app-client`,
      AllowedOAuthFlows: ['code'],
    })
  })

  test('Does not allow implicit code grant OAuth flows', () => {
    const { template } = createTemplate()

    template.hasResourceProperties(CfnUserPoolClient.CFN_RESOURCE_TYPE_NAME, {
      ClientName: `${constructPrefix}-auth-app-client`,
      AllowedOAuthFlows: Match.not(Match.arrayWith(['implicit'])),
    })
  })

  test('Does not allow client credentials OAuth flows', () => {
    const { template } = createTemplate()

    template.hasResourceProperties(CfnUserPoolClient.CFN_RESOURCE_TYPE_NAME, {
      ClientName: `${constructPrefix}-auth-app-client`,
      AllowedOAuthFlows: Match.not(Match.arrayWith(['client_credentials'])),
    })
  })

  test('Allows `phone` OAuth scope', () => {
    const { template } = createTemplate()

    template.hasResourceProperties(CfnUserPoolClient.CFN_RESOURCE_TYPE_NAME, {
      ClientName: `${constructPrefix}-auth-app-client`,
      AllowedOAuthScopes: Match.arrayWith([OAuthScope.PHONE.scopeName]),
    })
  })

  test('Allows `email` OAuth scope', () => {
    const { template } = createTemplate()

    template.hasResourceProperties(CfnUserPoolClient.CFN_RESOURCE_TYPE_NAME, {
      ClientName: `${constructPrefix}-auth-app-client`,
      AllowedOAuthScopes: Match.arrayWith([OAuthScope.EMAIL.scopeName]),
    })
  })

  test('Allows `openid` OAuth scope', () => {
    const { template } = createTemplate()

    template.hasResourceProperties(CfnUserPoolClient.CFN_RESOURCE_TYPE_NAME, {
      ClientName: `${constructPrefix}-auth-app-client`,
      AllowedOAuthScopes: Match.arrayWith([OAuthScope.OPENID.scopeName]),
    })
  })

  test('Allows `profile` OAuth scope', () => {
    const { template } = createTemplate()

    template.hasResourceProperties(CfnUserPoolClient.CFN_RESOURCE_TYPE_NAME, {
      ClientName: `${constructPrefix}-auth-app-client`,
      AllowedOAuthScopes: Match.arrayWith([OAuthScope.PROFILE.scopeName]),
    })
  })

  test('Does not allow any other OAuth scopes', () => {
    const { template } = createTemplate()

    const scopesCapture = new Capture()

    template.hasResourceProperties(CfnUserPoolClient.CFN_RESOURCE_TYPE_NAME, {
      ClientName: `${constructPrefix}-auth-app-client`,
      AllowedOAuthScopes: scopesCapture,
    })

    const validScopes = [
      OAuthScope.PHONE.scopeName,
      OAuthScope.EMAIL.scopeName,
      OAuthScope.OPENID.scopeName,
      OAuthScope.PROFILE.scopeName,
    ]

    for (const scope of scopesCapture.asArray()) {
      expect(validScopes).toContain(scope)
    }
  })

  test('Allows localhost callback URLs when the app environment is `dev`', () => {
    let { template } = createTemplate({ appEnv: 'dev' })

    template.hasResourceProperties(CfnUserPoolClient.CFN_RESOURCE_TYPE_NAME, {
      ClientName: `${constructPrefix}-auth-app-client`,
      CallbackURLs: Match.arrayWith(['http://localhost:3000/callback']),
    })

    template = createTemplate().template

    template.hasResourceProperties(CfnUserPoolClient.CFN_RESOURCE_TYPE_NAME, {
      ClientName: `${constructPrefix}-auth-app-client`,
      CallbackURLs: Match.not(Match.arrayWith(['http://localhost:3000/callback'])),
    })
  })

  test('Allows callbacks back to auth webapp', () => {
    const { template } = createTemplate()

    template.hasResourceProperties(CfnUserPoolClient.CFN_RESOURCE_TYPE_NAME, {
      ClientName: `${constructPrefix}-auth-app-client`,
      CallbackURLs: Match.arrayWith([signInCallbackUrl]),
    })
  })

  test('Allows client to write to `email` standard attribute', () => {
    const { template } = createTemplate()

    template.hasResourceProperties(CfnUserPoolClient.CFN_RESOURCE_TYPE_NAME, {
      ClientName: `${constructPrefix}-auth-app-client`,
      WriteAttributes: Match.arrayWith(['email']),
    })
  })

  test('Allows client to write to `name` standard attribute', () => {
    const { template } = createTemplate()

    template.hasResourceProperties(CfnUserPoolClient.CFN_RESOURCE_TYPE_NAME, {
      ClientName: `${constructPrefix}-auth-app-client`,
      WriteAttributes: Match.arrayWith(['name']),
    })
  })

  test('Allows client to write to `phone_number` standard attribute', () => {
    const { template } = createTemplate()

    template.hasResourceProperties(CfnUserPoolClient.CFN_RESOURCE_TYPE_NAME, {
      ClientName: `${constructPrefix}-auth-app-client`,
      WriteAttributes: Match.arrayWith(['phone_number']),
    })
  })
})

describe('CognitoStack.MerchantWalletAppUserPoolClient', () => {
  test('References the correct User Pool', () => {
    const { stack, template } = createTemplate()

    const userPool = stack.node.findChild('UserPool') as UserPool

    template.hasResourceProperties(CfnUserPoolClient.CFN_RESOURCE_TYPE_NAME, {
      ClientName: `${constructPrefix}-merchant-wallet-app-client`,
      UserPoolId: {
        Ref: CDKTestUtils.getLogicalId(userPool),
      },
    })
  })

  test('Prevents user existence errors from being thrown', () => {
    const { template } = createTemplate()

    template.hasResourceProperties(CfnUserPoolClient.CFN_RESOURCE_TYPE_NAME, {
      ClientName: `${constructPrefix}-merchant-wallet-app-client`,
      PreventUserExistenceErrors: 'ENABLED',
    })
  })

  test('Does not generate an app secret', () => {
    const { template } = createTemplate()

    template.hasResourceProperties(CfnUserPoolClient.CFN_RESOURCE_TYPE_NAME, {
      ClientName: `${constructPrefix}-merchant-wallet-app-client`,
      GenerateSecret: false,
    })
  })

  test('Allows authorization code grant OAuth flows', () => {
    const { template } = createTemplate()

    template.hasResourceProperties(CfnUserPoolClient.CFN_RESOURCE_TYPE_NAME, {
      ClientName: `${constructPrefix}-merchant-wallet-app-client`,
      AllowedOAuthFlows: ['code'],
    })
  })

  test('Does not allow implicit code grant OAuth flows', () => {
    const { template } = createTemplate()

    template.hasResourceProperties(CfnUserPoolClient.CFN_RESOURCE_TYPE_NAME, {
      ClientName: `${constructPrefix}-merchant-wallet-app-client`,
      AllowedOAuthFlows: Match.not(Match.arrayWith(['implicit'])),
    })
  })

  test('Does not allow client credentials OAuth flows', () => {
    const { template } = createTemplate()

    template.hasResourceProperties(CfnUserPoolClient.CFN_RESOURCE_TYPE_NAME, {
      ClientName: `${constructPrefix}-merchant-wallet-app-client`,
      AllowedOAuthFlows: Match.not(Match.arrayWith(['client_credentials'])),
    })
  })

  test('Allows `phone` OAuth scope', () => {
    const { template } = createTemplate()

    template.hasResourceProperties(CfnUserPoolClient.CFN_RESOURCE_TYPE_NAME, {
      ClientName: `${constructPrefix}-merchant-wallet-app-client`,
      AllowedOAuthScopes: Match.arrayWith([OAuthScope.PHONE.scopeName]),
    })
  })

  test('Allows `email` OAuth scope', () => {
    const { template } = createTemplate()

    template.hasResourceProperties(CfnUserPoolClient.CFN_RESOURCE_TYPE_NAME, {
      ClientName: `${constructPrefix}-merchant-wallet-app-client`,
      AllowedOAuthScopes: Match.arrayWith([OAuthScope.EMAIL.scopeName]),
    })
  })

  test('Allows `openid` OAuth scope', () => {
    const { template } = createTemplate()

    template.hasResourceProperties(CfnUserPoolClient.CFN_RESOURCE_TYPE_NAME, {
      ClientName: `${constructPrefix}-merchant-wallet-app-client`,
      AllowedOAuthScopes: Match.arrayWith([OAuthScope.OPENID.scopeName]),
    })
  })

  test('Allows `profile` OAuth scope', () => {
    const { template } = createTemplate()

    template.hasResourceProperties(CfnUserPoolClient.CFN_RESOURCE_TYPE_NAME, {
      ClientName: `${constructPrefix}-merchant-wallet-app-client`,
      AllowedOAuthScopes: Match.arrayWith([OAuthScope.PROFILE.scopeName]),
    })
  })

  test('Does not allow any other OAuth scopes', () => {
    const { template } = createTemplate()

    const scopesCapture = new Capture()

    template.hasResourceProperties(CfnUserPoolClient.CFN_RESOURCE_TYPE_NAME, {
      ClientName: `${constructPrefix}-merchant-wallet-app-client`,
      AllowedOAuthScopes: scopesCapture,
    })

    const validScopes = [
      OAuthScope.PHONE.scopeName,
      OAuthScope.EMAIL.scopeName,
      OAuthScope.OPENID.scopeName,
      OAuthScope.PROFILE.scopeName,
    ]

    for (const scope of scopesCapture.asArray()) {
      expect(validScopes).toContain(scope)
    }
  })

  test('Allows `myapp` callback URLs', () => {
    const { template } = createTemplate()

    template.hasResourceProperties(CfnUserPoolClient.CFN_RESOURCE_TYPE_NAME, {
      ClientName: `${constructPrefix}-merchant-wallet-app-client`,
      CallbackURLs: Match.arrayWith(['myapp://auth']),
    })
  })

  test('Allows `myapp` logout URLs', () => {
    const { template } = createTemplate()

    template.hasResourceProperties(CfnUserPoolClient.CFN_RESOURCE_TYPE_NAME, {
      ClientName: `${constructPrefix}-merchant-wallet-app-client`,
      LogoutURLs: Match.arrayWith(['myapp://auth']),
    })
  })

  test('Allows client to write to `email` standard attribute', () => {
    const { template } = createTemplate()

    template.hasResourceProperties(CfnUserPoolClient.CFN_RESOURCE_TYPE_NAME, {
      ClientName: `${constructPrefix}-merchant-wallet-app-client`,
      WriteAttributes: Match.arrayWith(['email']),
    })
  })

  test('Allows client to write to `name` standard attribute', () => {
    const { template } = createTemplate()

    template.hasResourceProperties(CfnUserPoolClient.CFN_RESOURCE_TYPE_NAME, {
      ClientName: `${constructPrefix}-merchant-wallet-app-client`,
      WriteAttributes: Match.arrayWith(['name']),
    })
  })

  test('Allows client to write to `phone_number` standard attribute', () => {
    const { template } = createTemplate()

    template.hasResourceProperties(CfnUserPoolClient.CFN_RESOURCE_TYPE_NAME, {
      ClientName: `${constructPrefix}-merchant-wallet-app-client`,
      WriteAttributes: Match.arrayWith(['phone_number']),
    })
  })
})

describe('CognitoStack.MerchantWalletAppUserPoolClient', () => {
  test('References the correct User Pool', () => {
    const { stack, template } = createTemplate()

    const userPool = stack.node.findChild('UserPool') as UserPool

    template.hasResourceProperties(CfnUserPoolClient.CFN_RESOURCE_TYPE_NAME, {
      ClientName: `${constructPrefix}-solta-wallet-app-client`,
      UserPoolId: {
        Ref: CDKTestUtils.getLogicalId(userPool),
      },
    })
  })

  test('Prevents user existence errors from being thrown', () => {
    const { template } = createTemplate()

    template.hasResourceProperties(CfnUserPoolClient.CFN_RESOURCE_TYPE_NAME, {
      ClientName: `${constructPrefix}-solta-wallet-app-client`,
      PreventUserExistenceErrors: 'ENABLED',
    })
  })

  test('Does not generate an app secret', () => {
    const { template } = createTemplate()

    template.hasResourceProperties(CfnUserPoolClient.CFN_RESOURCE_TYPE_NAME, {
      ClientName: `${constructPrefix}-solta-wallet-app-client`,
      GenerateSecret: false,
    })
  })

  test('Allows authorization code grant OAuth flows', () => {
    const { template } = createTemplate()

    template.hasResourceProperties(CfnUserPoolClient.CFN_RESOURCE_TYPE_NAME, {
      ClientName: `${constructPrefix}-solta-wallet-app-client`,
      AllowedOAuthFlows: ['code'],
    })
  })

  test('Does not allow implicit code grant OAuth flows', () => {
    const { template } = createTemplate()

    template.hasResourceProperties(CfnUserPoolClient.CFN_RESOURCE_TYPE_NAME, {
      ClientName: `${constructPrefix}-solta-wallet-app-client`,
      AllowedOAuthFlows: Match.not(Match.arrayWith(['implicit'])),
    })
  })

  test('Does not allow client credentials OAuth flows', () => {
    const { template } = createTemplate()

    template.hasResourceProperties(CfnUserPoolClient.CFN_RESOURCE_TYPE_NAME, {
      ClientName: `${constructPrefix}-solta-wallet-app-client`,
      AllowedOAuthFlows: Match.not(Match.arrayWith(['client_credentials'])),
    })
  })

  test('Allows `phone` OAuth scope', () => {
    const { template } = createTemplate()

    template.hasResourceProperties(CfnUserPoolClient.CFN_RESOURCE_TYPE_NAME, {
      ClientName: `${constructPrefix}-solta-wallet-app-client`,
      AllowedOAuthScopes: Match.arrayWith([OAuthScope.PHONE.scopeName]),
    })
  })

  test('Allows `email` OAuth scope', () => {
    const { template } = createTemplate()

    template.hasResourceProperties(CfnUserPoolClient.CFN_RESOURCE_TYPE_NAME, {
      ClientName: `${constructPrefix}-solta-wallet-app-client`,
      AllowedOAuthScopes: Match.arrayWith([OAuthScope.EMAIL.scopeName]),
    })
  })

  test('Allows `openid` OAuth scope', () => {
    const { template } = createTemplate()

    template.hasResourceProperties(CfnUserPoolClient.CFN_RESOURCE_TYPE_NAME, {
      ClientName: `${constructPrefix}-solta-wallet-app-client`,
      AllowedOAuthScopes: Match.arrayWith([OAuthScope.OPENID.scopeName]),
    })
  })

  test('Allows `profile` OAuth scope', () => {
    const { template } = createTemplate()

    template.hasResourceProperties(CfnUserPoolClient.CFN_RESOURCE_TYPE_NAME, {
      ClientName: `${constructPrefix}-solta-wallet-app-client`,
      AllowedOAuthScopes: Match.arrayWith([OAuthScope.PROFILE.scopeName]),
    })
  })

  test('Does not allow any other OAuth scopes', () => {
    const { template } = createTemplate()

    const scopesCapture = new Capture()

    template.hasResourceProperties(CfnUserPoolClient.CFN_RESOURCE_TYPE_NAME, {
      ClientName: `${constructPrefix}-solta-wallet-app-client`,
      AllowedOAuthScopes: scopesCapture,
    })

    const validScopes = [
      OAuthScope.PHONE.scopeName,
      OAuthScope.EMAIL.scopeName,
      OAuthScope.OPENID.scopeName,
      OAuthScope.PROFILE.scopeName,
    ]

    for (const scope of scopesCapture.asArray()) {
      expect(validScopes).toContain(scope)
    }
  })

  test('Allows `myapp` callback URLs', () => {
    const { template } = createTemplate()

    template.hasResourceProperties(CfnUserPoolClient.CFN_RESOURCE_TYPE_NAME, {
      ClientName: `${constructPrefix}-solta-wallet-app-client`,
      CallbackURLs: Match.arrayWith(['myapp://auth']),
    })
  })

  test('Allows `myapp` logout URLs', () => {
    const { template } = createTemplate()

    template.hasResourceProperties(CfnUserPoolClient.CFN_RESOURCE_TYPE_NAME, {
      ClientName: `${constructPrefix}-solta-wallet-app-client`,
      LogoutURLs: Match.arrayWith(['myapp://auth']),
    })
  })

  test('Allows client to write to `email` standard attribute', () => {
    const { template } = createTemplate()

    template.hasResourceProperties(CfnUserPoolClient.CFN_RESOURCE_TYPE_NAME, {
      ClientName: `${constructPrefix}-solta-wallet-app-client`,
      WriteAttributes: Match.arrayWith(['email']),
    })
  })

  test('Allows client to write to `name` standard attribute', () => {
    const { template } = createTemplate()

    template.hasResourceProperties(CfnUserPoolClient.CFN_RESOURCE_TYPE_NAME, {
      ClientName: `${constructPrefix}-solta-wallet-app-client`,
      WriteAttributes: Match.arrayWith(['name']),
    })
  })

  test('Allows client to write to `phone_number` standard attribute', () => {
    const { template } = createTemplate()

    template.hasResourceProperties(CfnUserPoolClient.CFN_RESOURCE_TYPE_NAME, {
      ClientName: `${constructPrefix}-solta-wallet-app-client`,
      WriteAttributes: Match.arrayWith(['phone_number']),
    })
  })
})

describe('CognitoStack.IdentityServiceUserPoolResourceServer', () => {
  test('References the correct User Pool', () => {
    const { stack, template } = createTemplate()

    const userPool = stack.node.findChild('UserPool') as UserPool

    template.hasResourceProperties(CfnUserPoolResourceServer.CFN_RESOURCE_TYPE_NAME, {
      UserPoolId: {
        Ref: CDKTestUtils.getLogicalId(userPool),
      },
    })
  })

  test("Uses the identity service's URL as its identifier", () => {
    const { template } = createTemplate()

    template.hasResourceProperties(CfnUserPoolResourceServer.CFN_RESOURCE_TYPE_NAME, {
      Name: 'Identity Service',
      Identifier: identityServiceUrl,
    })
  })

  test('Allows `accessKey:create` custom OAuth scope', () => {
    const { template } = createTemplate()

    template.hasResourceProperties(CfnUserPoolResourceServer.CFN_RESOURCE_TYPE_NAME, {
      Name: 'Identity Service',
      Scopes: Match.arrayWith([Match.objectLike({ ScopeName: 'accessKey:create' })]),
    })
  })

  test('Allows `accessKey:validate` custom OAuth scope', () => {
    const { template } = createTemplate()

    template.hasResourceProperties(CfnUserPoolResourceServer.CFN_RESOURCE_TYPE_NAME, {
      Name: 'Identity Service',
      Scopes: Match.arrayWith([Match.objectLike({ ScopeName: 'accessKey:validate' })]),
    })
  })

  test('Allows `identity:create` custom OAuth scope', () => {
    const { template } = createTemplate()

    template.hasResourceProperties(CfnUserPoolResourceServer.CFN_RESOURCE_TYPE_NAME, {
      Name: 'Identity Service',
      Scopes: Match.arrayWith([Match.objectLike({ ScopeName: 'identity:create' })]),
    })
  })

  test('Allows `identity:read` custom OAuth scope', () => {
    const { template } = createTemplate()

    template.hasResourceProperties(CfnUserPoolResourceServer.CFN_RESOURCE_TYPE_NAME, {
      Name: 'Identity Service',
      Scopes: Match.arrayWith([Match.objectLike({ ScopeName: 'identity:read' })]),
    })
  })

  test('Allows `invitation:create` custom OAuth scope', () => {
    const { template } = createTemplate()

    template.hasResourceProperties(CfnUserPoolResourceServer.CFN_RESOURCE_TYPE_NAME, {
      Name: 'Identity Service',
      Scopes: Match.arrayWith([Match.objectLike({ ScopeName: 'invitation:create' })]),
    })
  })

  test('Allows `invitation:accept` custom OAuth scope', () => {
    const { template } = createTemplate()

    template.hasResourceProperties(CfnUserPoolResourceServer.CFN_RESOURCE_TYPE_NAME, {
      Name: 'Identity Service',
      Scopes: Match.arrayWith([Match.objectLike({ ScopeName: 'invitation:accept' })]),
    })
  })

  test('Allows `invitation:read` custom OAuth scope', () => {
    const { template } = createTemplate()

    template.hasResourceProperties(CfnUserPoolResourceServer.CFN_RESOURCE_TYPE_NAME, {
      Name: 'Identity Service',
      Scopes: Match.arrayWith([Match.objectLike({ ScopeName: 'invitation:read' })]),
    })
  })

  test('Does not allow any other OAuth scopes', () => {
    const { template } = createTemplate()

    const scopesCapture = new Capture()

    template.hasResourceProperties(CfnUserPoolResourceServer.CFN_RESOURCE_TYPE_NAME, {
      Name: 'Identity Service',
      Scopes: scopesCapture,
    })

    const allowedScopes = [
      'accessKey:create',
      'accessKey:validate',

      'identity:create',
      'identity:read',
      'identity:platform-access',

      'invitation:create',
      'invitation:accept',
      'invitation:read',
    ].map((allowedScope) => ({ ScopeName: allowedScope }))

    const scopesCaptureArray = scopesCapture.asArray()

    for (let i = 0; i < scopesCaptureArray.length; i += 1) {
      const { ScopeName } = scopesCaptureArray[i] as {
        ScopeName?: string
        ScopeDescription?: string
      }

      expect(allowedScopes).toContainEqual({ ScopeName })
    }
  })
})

describe('CognitoStack.IdentityServiceUserPoolClient', () => {
  test('References the correct User Pool', () => {
    const { stack, template } = createTemplate()

    const userPool = stack.node.findChild('UserPool') as UserPool

    template.hasResourceProperties(CfnUserPoolClient.CFN_RESOURCE_TYPE_NAME, {
      ClientName: `${constructPrefix}-identity-service-client`,
      UserPoolId: {
        Ref: CDKTestUtils.getLogicalId(userPool),
      },
    })
  })

  test('Supports `Cognito` as an identity provider', () => {
    const { template } = createTemplate()

    template.hasResourceProperties(CfnUserPoolClient.CFN_RESOURCE_TYPE_NAME, {
      ClientName: `${constructPrefix}-auth-app-client`,
      SupportedIdentityProviders: [UserPoolClientIdentityProvider.COGNITO.name],
    })
  })

  test('Prevents user existence errors from being thrown', () => {
    const { template } = createTemplate()

    template.hasResourceProperties(CfnUserPoolClient.CFN_RESOURCE_TYPE_NAME, {
      ClientName: `${constructPrefix}-identity-service-client`,
      PreventUserExistenceErrors: 'ENABLED',
    })
  })

  test('Generate an app secret', () => {
    const { template } = createTemplate()

    template.hasResourceProperties(CfnUserPoolClient.CFN_RESOURCE_TYPE_NAME, {
      ClientName: `${constructPrefix}-identity-service-client`,
      GenerateSecret: true,
    })
  })

  test('Does not allow authorization code grant OAuth flows', () => {
    const { template } = createTemplate()

    template.hasResourceProperties(CfnUserPoolClient.CFN_RESOURCE_TYPE_NAME, {
      ClientName: `${constructPrefix}-identity-service-client`,
      AllowedOAuthFlows: Match.not(Match.arrayWith(['code'])),
    })
  })

  test('Does not allow implicit code grant OAuth flows', () => {
    const { template } = createTemplate()

    template.hasResourceProperties(CfnUserPoolClient.CFN_RESOURCE_TYPE_NAME, {
      ClientName: `${constructPrefix}-identity-service-client`,
      AllowedOAuthFlows: Match.not(Match.arrayWith(['implicit'])),
    })
  })

  test('Allows client credentials OAuth flows', () => {
    const { template } = createTemplate()

    template.hasResourceProperties(CfnUserPoolClient.CFN_RESOURCE_TYPE_NAME, {
      ClientName: `${constructPrefix}-identity-service-client`,
      AllowedOAuthFlows: ['client_credentials'],
    })
  })

  test('Allows `accessKey:create` custom OAuth scope', () => {
    const { template } = createTemplate()

    template.hasResourceProperties(CfnUserPoolClient.CFN_RESOURCE_TYPE_NAME, {
      ClientName: `${constructPrefix}-identity-service-client`,
      AllowedOAuthScopes: Match.arrayWith([`${identityServiceUrl}/accessKey:create`]),
    })
  })

  test('Allows `accessKey:validate` custom OAuth scope', () => {
    const { template } = createTemplate()

    template.hasResourceProperties(CfnUserPoolClient.CFN_RESOURCE_TYPE_NAME, {
      ClientName: `${constructPrefix}-identity-service-client`,
      AllowedOAuthScopes: Match.arrayWith([`${identityServiceUrl}/accessKey:validate`]),
    })
  })

  test('Allows `identity:create` custom OAuth scope', () => {
    const { template } = createTemplate()

    template.hasResourceProperties(CfnUserPoolClient.CFN_RESOURCE_TYPE_NAME, {
      ClientName: `${constructPrefix}-identity-service-client`,
      AllowedOAuthScopes: Match.arrayWith([`${identityServiceUrl}/identity:create`]),
    })
  })

  test('Allows `identity:read` custom OAuth scope', () => {
    const { template } = createTemplate()

    template.hasResourceProperties(CfnUserPoolClient.CFN_RESOURCE_TYPE_NAME, {
      ClientName: `${constructPrefix}-identity-service-client`,
      AllowedOAuthScopes: Match.arrayWith([`${identityServiceUrl}/identity:read`]),
    })
  })

  test('Allows `invitation:create` custom OAuth scope', () => {
    const { template } = createTemplate()

    template.hasResourceProperties(CfnUserPoolClient.CFN_RESOURCE_TYPE_NAME, {
      ClientName: `${constructPrefix}-identity-service-client`,
      AllowedOAuthScopes: Match.arrayWith([`${identityServiceUrl}/invitation:create`]),
    })
  })

  test('Allows `invitation:accept` custom OAuth scope', () => {
    const { template } = createTemplate()

    template.hasResourceProperties(CfnUserPoolClient.CFN_RESOURCE_TYPE_NAME, {
      ClientName: `${constructPrefix}-identity-service-client`,
      AllowedOAuthScopes: Match.arrayWith([`${identityServiceUrl}/invitation:accept`]),
    })
  })

  test('Allows `invitation:read` custom OAuth scope', () => {
    const { template } = createTemplate()

    template.hasResourceProperties(CfnUserPoolClient.CFN_RESOURCE_TYPE_NAME, {
      ClientName: `${constructPrefix}-identity-service-client`,
      AllowedOAuthScopes: Match.arrayWith([`${identityServiceUrl}/invitation:read`]),
    })
  })

  test('Does not allow any other OAuth scopes', () => {
    const { template } = createTemplate()

    const scopesCapture = new Capture()

    template.hasResourceProperties(CfnUserPoolClient.CFN_RESOURCE_TYPE_NAME, {
      ClientName: `${constructPrefix}-identity-service-client`,
      AllowedOAuthScopes: scopesCapture,
    })

    const allowedScopes = [
      'accessKey:create',
      'accessKey:validate',

      'identity:create',
      'identity:read',

      'invitation:create',
      'invitation:accept',
      'invitation:read',
    ].map((scope) => `${identityServiceUrl}/${scope}`)

    for (const scope of scopesCapture.asArray()) {
      expect(allowedScopes).toContainEqual(scope)
    }
  })

  test('Allows localhost callback URLs when the app environment is `dev`', () => {
    let { template } = createTemplate({ appEnv: 'dev' })

    template.hasResourceProperties(CfnUserPoolClient.CFN_RESOURCE_TYPE_NAME, {
      ClientName: `${constructPrefix}-identity-service-client`,
      CallbackURLs: Match.arrayWith(['http://localhost:3000/callback']),
    })

    template = createTemplate().template

    template.hasResourceProperties(CfnUserPoolClient.CFN_RESOURCE_TYPE_NAME, {
      ClientName: `${constructPrefix}-identity-service-client`,
      CallbackURLs: Match.not(Match.arrayWith(['http://localhost:3000/callback'])),
    })
  })

  test('Allows callbacks back to auth webapp', () => {
    const { template } = createTemplate()

    template.hasResourceProperties(CfnUserPoolClient.CFN_RESOURCE_TYPE_NAME, {
      ClientName: `${constructPrefix}-identity-service-client`,
      CallbackURLs: Match.arrayWith([signInCallbackUrl]),
    })
  })

  test('Allows client to write to `email` standard attribute', () => {
    const { template } = createTemplate()

    template.hasResourceProperties(CfnUserPoolClient.CFN_RESOURCE_TYPE_NAME, {
      ClientName: `${constructPrefix}-identity-service-client`,
      WriteAttributes: Match.arrayWith(['email']),
    })
  })

  test('Allows client to write to `name` standard attribute', () => {
    const { template } = createTemplate()

    template.hasResourceProperties(CfnUserPoolClient.CFN_RESOURCE_TYPE_NAME, {
      ClientName: `${constructPrefix}-identity-service-client`,
      WriteAttributes: Match.arrayWith(['name']),
    })
  })

  test('Allows client to write to `phone_number` standard attribute', () => {
    const { template } = createTemplate()

    template.hasResourceProperties(CfnUserPoolClient.CFN_RESOURCE_TYPE_NAME, {
      ClientName: `${constructPrefix}-identity-service-client`,
      WriteAttributes: Match.arrayWith(['phone_number']),
    })
  })
})
