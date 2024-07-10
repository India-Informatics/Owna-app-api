import { Stack, Duration, CfnOutput, Aws } from 'aws-cdk-lib'
import {
  UserPool,
  Mfa,
  UserPoolEmail,
  AccountRecovery,
  CfnUserPool,
  UserPoolDomain,
  UserPoolClient,
  UserPoolClientIdentityProvider,
  OAuthScope,
  ClientAttributes,
  UserPoolResourceServer,
  ResourceServerScope,
  StringAttribute,
} from 'aws-cdk-lib/aws-cognito'
import {
  Role,
  ServicePrincipal,
  PolicyDocument,
  PolicyStatement,
  Effect,
} from 'aws-cdk-lib/aws-iam'
import { Construct } from 'constructs'

import { StackProps } from '../../../utils'
import { getContext } from '../../../utils'

interface CognitoStackProps extends StackProps {
  stackName: string
  env: {
    account: string
    region: string
  }
  email: {
    sendFrom: string
    sendFromName: string
  }
}

export class CognitoStack extends Stack {
  constructor(scope: Construct, id: string, props: CognitoStackProps) {
    super(scope, id, props)

    const appEnv = getContext(this, 'appEnv')
    const constructPrefix = getContext(this, 'constructPrefix')

    const cognitoSnsRole = new Role(this, 'CognitoSNSRole', {
      assumedBy: new ServicePrincipal('cognito-idp.amazonaws.com'),
      // Even though we declare these policies as inline, CDK will still synth them
      // into a separate policy resource and then link it back to the Role via the
      // `Roles` CF property. This is to prevent cyclic references of policies.
      inlinePolicies: {
        CognitoSNSPolicy: new PolicyDocument({
          statements: [
            new PolicyStatement({
              effect: Effect.ALLOW,
              actions: ['sns:publish'],
              resources: ['*'],
            }),
          ],
        }),
      },
    })

    const userPool = new UserPool(this, 'UserPool', {
      userPoolName: `${constructPrefix}-user-pool`,

      autoVerify: {
        email: true,
        phone: true,
      },

      mfa: Mfa.OPTIONAL,
      mfaSecondFactor: {
        otp: true,
        sms: true,
      },

      selfSignUpEnabled: true,

      smsRole: cognitoSnsRole,
      smsRoleExternalId: `${constructPrefix}-external`,

      signInAliases: { email: true, username: false },
      signInCaseSensitive: false,

      email: UserPoolEmail.withSES({
        fromName: props.email.sendFromName,
        fromEmail: props.email.sendFrom,
        replyTo: props.email.sendFrom,
        sesRegion: 'us-west-2',
      }),

      deviceTracking: {
        challengeRequiredOnNewDevice: true,
        deviceOnlyRememberedOnUserPrompt: true,
      },

      passwordPolicy: {
        minLength: 8,
        requireLowercase: true,
        requireDigits: true,
        requireSymbols: false,
        requireUppercase: true,
        tempPasswordValidity: Duration.days(2),
      },

      accountRecovery: AccountRecovery.EMAIL_AND_PHONE_WITHOUT_MFA,

      standardAttributes: {
        fullname: {
          mutable: true,
          required: true,
        },
        phoneNumber: {
          mutable: true,
          required: false,
        },
        email: {
          mutable: true,
          required: true,
        },
      },
      customAttributes: {
        // eslint-disable-next-line camelcase
        preferred_name: new StringAttribute({
          mutable: true,
        }),
      },
    })

    const cfnUserPool = userPool.node.defaultChild as CfnUserPool

    // Advanced security mode not yet available in CDK, so we'll use the CFN escape
    // hatch to configure this instead.
    // See this issue to see how progress is tracking:
    // https://github.com/aws/aws-cdk/issues/7405
    cfnUserPool.userPoolAddOns = {
      advancedSecurityMode: 'AUDIT',
    }

    const userPoolDomain = new UserPoolDomain(this, 'UserPoolDomain', {
      userPool,
      cognitoDomain: { domainPrefix: constructPrefix },
    })

    // const { identityServiceUrl } = props

    const accessKeyScopes = {
      create: new ResourceServerScope({
        scopeName: 'accessKey:create',
        scopeDescription: 'Create access keys',
      }),

      validate: new ResourceServerScope({
        scopeName: 'accessKey:validate',
        scopeDescription: 'Validate access keys',
      }),
    }

    const identityScopes = {
      create: new ResourceServerScope({
        scopeName: 'identity:create',
        scopeDescription: 'Create identities',
      }),

      read: new ResourceServerScope({
        scopeName: 'identity:read',
        scopeDescription: 'Read identities',
      }),

      platformaccess: new ResourceServerScope({
        scopeName: 'identity:platform-access',
        scopeDescription: 'Scope for platform access',
      }),
    }

    const invitationScopes = {
      create: new ResourceServerScope({
        scopeName: 'invitation:create',
        scopeDescription: 'Create invitations',
      }),

      accept: new ResourceServerScope({
        scopeName: 'invitation:accept',
        scopeDescription: 'Accept invitations',
      }),

      read: new ResourceServerScope({
        scopeName: 'invitation:read',
        scopeDescription: 'Read invitations',
      }),
    }

    // const userPoolResourceServer = new UserPoolResourceServer(
    //   this,
    //   'IdentityServiceUserPoolResourceServer',
    //   {
    //     userPool,
    //     identifier: identityServiceUrl,
    //     userPoolResourceServerName: 'Identity Service',
    //     scopes: [
    //       accessKeyScopes.create,
    //       accessKeyScopes.validate,

    //       identityScopes.create,
    //       identityScopes.read,
    //       identityScopes.platformaccess,

    //       invitationScopes.create,
    //       invitationScopes.accept,
    //       invitationScopes.read,
    //     ],
    //   },
    // )

    const ownaWalletAppClient = new UserPoolClient(
      this,
      'OwnaWalletAppUserPoolClient',
      {
        userPool,
        userPoolClientName: `${constructPrefix}-owna-wallet-app-client`,
        supportedIdentityProviders: [UserPoolClientIdentityProvider.COGNITO],

        preventUserExistenceErrors: true,
        generateSecret: false,

        oAuth: {
          flows: {
            authorizationCodeGrant: true,
            implicitCodeGrant: false,
            clientCredentials: false,
          },

          scopes: [
            OAuthScope.PHONE,
            OAuthScope.EMAIL,
            OAuthScope.OPENID,
            OAuthScope.PROFILE,
          ],

          callbackUrls: ['myapp://auth'],
          logoutUrls: ['myapp://auth'],
        },

        writeAttributes: new ClientAttributes().withStandardAttributes({
          email: true,
          fullname: true,
          phoneNumber: true,
        }),
      },
    )

    // ownaWalletAppClient.node.addDependency(userPoolResourceServer)

    const getExportName = (suffix: string) => `${props.stackName}-${suffix}`

    new CfnOutput(this, 'UserPoolIdOutput', {
      value: userPool.userPoolId,
      exportName: getExportName('UserPoolId'),
    })

    new CfnOutput(this, 'UserPoolArnOutput', {
      value: userPool.userPoolArn,
      exportName: getExportName('UserPoolArn'),
    })

    new CfnOutput(this, 'UserPoolDomainOutput', {
      value: userPoolDomain.domainName,
      exportName: getExportName('UserPoolDomain'),
    })

    new CfnOutput(this, 'OwnaWalletAppUserPoolClientIdOutput', {
      value: ownaWalletAppClient.userPoolClientId,
      exportName: getExportName('OwnaWalletAppUserPoolClientId'),
    })
  }
}
