/* eslint-disable @typescript-eslint/no-unsafe-call */
import { Stack, StackProps, Duration, CfnOutput, Fn } from 'aws-cdk-lib'
import {
  ScalableTarget,
  ServiceNamespace,
  TargetTrackingScalingPolicy,
  PredefinedMetric,
} from 'aws-cdk-lib/aws-applicationautoscaling'
import { Vpc, SecurityGroup, Subnet } from 'aws-cdk-lib/aws-ec2'
import { Repository, TagStatus, TagMutability } from 'aws-cdk-lib/aws-ecr'
import {
  Secret,
  FargateService,
  Cluster,
  FargateTaskDefinition,
  AwsLogDriver,
  ContainerImage,
} from 'aws-cdk-lib/aws-ecs'
import {
  ApplicationTargetGroup,
  TargetType,
  ApplicationProtocol,
  ApplicationListener,
  ApplicationListenerRule,
  ListenerAction,
  ListenerCondition,
  ApplicationListenerCertificate,
  ListenerCertificate,
} from 'aws-cdk-lib/aws-elasticloadbalancingv2'
import {
  Role,
  ServicePrincipal,
  PolicyDocument,
  PolicyStatement,
  ManagedPolicy,
} from 'aws-cdk-lib/aws-iam'
import { LogGroup, RetentionDays } from 'aws-cdk-lib/aws-logs'
import {
  RecordSet,
  RecordType,
  RecordTarget,
  HostedZone,
} from 'aws-cdk-lib/aws-route53'
import { StringParameter } from 'aws-cdk-lib/aws-ssm'
import { Construct } from 'constructs'

import { getContext } from '../../../utils'

interface ServiceStackProps extends StackProps {
  env: {
    region: string
    account: string
  }

  cognitoStackName: string
  vpcId: string
  hostedZone: string
  hostedZoneId: string
  imageTag?: string
  ecrRepoName: string
}

export class ServiceStack extends Stack {
  constructor(scope: Construct, id: string, props: ServiceStackProps) {
    super(scope, id, props)

    const constructPrefix = getContext(this, 'constructPrefix')
    const appEnv = getContext(this, 'appEnv')

    const {
      cognitoStackName,
      env: { region, account: accountId },
      vpcId,
      hostedZone,
      hostedZoneId,
      imageTag,
      ecrRepoName,
    } = props

    const apiName = `api`

    const clusterName = `${constructPrefix}-cluster`
    const subDomain = `owna.api`

    const vpc = Vpc.fromLookup(this, 'Vpc', { vpcId })
    const imageRepository = Repository.fromRepositoryName(this, 'owna/api', 'owna/api')
    // const imageRepository = new Repository(this, 'ImageRepository', {
    //   // If set `imageTagMutability` to `IMMUTABLE`, we won’t be able to deploy a new image and tag it as `latest`,
    //   // which is necessary for finding the most up to date image when updating our infrastructure.
    //   imageTagMutability: TagMutability.MUTABLE,
    //   repositoryName: ecrRepoName,
    //   imageScanOnPush: true,
    //   lifecycleRules: [
    //     {
    //       rulePriority: 5,
    //       description: 'Expire images after 5 count',
    //       maxImageCount: 5,
    //       tagStatus: TagStatus.ANY,
    //     },
    //   ],
    // })

    const executionRole = new Role(this, 'ExecutionRole', {
      roleName: `owna-${apiName}-execution-role`,
      assumedBy: new ServicePrincipal('ecs-tasks.amazonaws.com'),
      managedPolicies: [
        ManagedPolicy.fromAwsManagedPolicyName(
          'service-role/AmazonECSTaskExecutionRolePolicy',
        ),
      ],
      inlinePolicies: {
        [`owna-${apiName}-kms-usage-access`]: new PolicyDocument({
          statements: [
            new PolicyStatement({
              actions: ['kms:DescribeKey', 'kms:Decrypt', 'ssm:GetParameters'],
              resources: [
                Fn.importValue(`${appEnv}-owna-cluster-SecretKeyArn`),
                `arn:aws:ssm:${region}:${accountId}:parameter/owna/*`,
              ],
            }),
          ],
        }),
      },
    })

    const taskRole = new Role(this, 'TaskRole', {
      roleName: `owna-${apiName}-task-role`,
      assumedBy: new ServicePrincipal('ecs-tasks.amazonaws.com'),

      inlinePolicies: {
        [`owna-${apiName}-cognito-access`]: new PolicyDocument({
          statements: [
            new PolicyStatement({
              actions: [
                'cognito-identity:Describe*',
                'cognito-identity:Get*',
                'cognito-identity:List*',
                'cognito-idp:Describe*',
                'cognito-idp:AdminGet*',
                'cognito-idp:AdminList*',
                'cognito-idp:List*',
                'cognito-idp:Get*',
                'cognito-sync:Describe*',
                'cognito-sync:Get*',
                'cognito-sync:List*',
                'iam:ListOpenIdConnectProviders',
                'iam:ListRoles',
              ],
              resources: [Fn.importValue(`${cognitoStackName}-UserPoolArn`)],
            }),
          ],
        }),
      },
    })

    const autoScalingRole = new Role(this, 'AutoScalingRole', {
      roleName: `owna-${apiName}-asg`,
      assumedBy: new ServicePrincipal('ecs-tasks.amazonaws.com'),
      managedPolicies: [
        ManagedPolicy.fromAwsManagedPolicyName(
          'service-role/AmazonEC2ContainerServiceAutoscaleRole',
        ),
      ],
    })

    const taskDefinition = new FargateTaskDefinition(this, 'TaskDefinition', {
      memoryLimitMiB: 512,
      cpu: 256,
      family: `owna-${apiName}-task-definition`,
      executionRole,
      taskRole,
    })

    const logGroup = new LogGroup(this, 'LogGroup', {
      logGroupName: `/ecs/${clusterName}/${apiName}`,
      retention: RetentionDays.ONE_WEEK,
    })

    const logDriver = new AwsLogDriver({ logGroup, streamPrefix: 'ecs' })

    taskDefinition
      .addContainer('ServiceContainer', {
        containerName: `api`,
        image: ContainerImage.fromEcrRepository(imageRepository, imageTag),
        logging: logDriver,
        secrets: {
          DEBUG_FLAG: Secret.fromSsmParameter(
            StringParameter.fromStringParameterName(
              this,
              'DebugFlagParam',
              `/owna/debug_flag`,
            ),
          ),
          LOG_LEVEL: Secret.fromSsmParameter(
            StringParameter.fromStringParameterName(
              this,
              'LogLevelParam',
              `/owna/log_level`,
            ),
          ),
          DB_URI: Secret.fromSsmParameter(
            StringParameter.fromSecureStringParameterAttributes(this, 'DbURIParam', {
              parameterName: `/owna/db_uri`,
            }),
          ),
        },
      })
      .addPortMappings({ containerPort: 8080 })

    const service = new FargateService(this, 'Service', {
      serviceName: apiName,
      cluster: Cluster.fromClusterAttributes(this, 'Cluster', {
        clusterName,
        vpc,
        securityGroups: [],
        clusterArn: Fn.importValue(`${clusterName}-ClusterArn`),
      }),
      taskDefinition,
      desiredCount: 1,
      healthCheckGracePeriod: Duration.seconds(30),
      minHealthyPercent: 100,
      maxHealthyPercent: 200,
      assignPublicIp: false,
      vpcSubnets: {
        subnets: [
          Subnet.fromSubnetAttributes(this, 'PrivateSubnet1', {
            subnetId: Fn.importValue(`${appEnv}-vpc-PrivateSubnet1`),
            routeTableId: Fn.importValue(`${appEnv}-vpc-PrivateSubnetRouteTable`),
          }),
          Subnet.fromSubnetAttributes(this, 'PrivateSubnet2', {
            subnetId: Fn.importValue(`${appEnv}-vpc-PrivateSubnet2`),
            routeTableId: Fn.importValue(`${appEnv}-vpc-PrivateSubnetRouteTable`),
          }),
          Subnet.fromSubnetAttributes(this, 'PrivateSubnet3', {
            subnetId: Fn.importValue(`${appEnv}-vpc-PrivateSubnet3`),
            routeTableId: Fn.importValue(`${appEnv}-vpc-PrivateSubnetRouteTable`),
          }),
        ],
      },
      securityGroups: [
        SecurityGroup.fromLookupByName(
          this,
          'ServiceSecurityGroup',
          `${appEnv}-owna services`,
          vpc,
        ),
      ],
    })

    const targetGroup = new ApplicationTargetGroup(this, 'TargetGroup', {
      targetGroupName: `owna-${apiName}-ext-tg`,
      targetType: TargetType.IP,
      port: 8080,
      healthCheck: {
        path: '/',
        interval: Duration.seconds(10),
        timeout: Duration.seconds(5),
        healthyThresholdCount: 2,
        unhealthyThresholdCount: 2,
      },
      protocol: ApplicationProtocol.HTTP,
      deregistrationDelay: Duration.seconds(300),
      vpc,
    })

    const listener = ApplicationListener.fromLookup(this, 'OwnaPublicAlbListener', {
      listenerArn: StringParameter.valueFromLookup(
        this,
        '/owna/alb/external_https_listener_arn',
      ),
    })
    // TODO: Change this ALB listener to an OWNA load balancer specific listener.

    service.attachToApplicationTargetGroup(targetGroup)

    new ApplicationListenerRule(this, 'ServiceALBListenerRule', {
      listener,
      priority: 12,
      action: ListenerAction.forward([targetGroup]),
      conditions: [ListenerCondition.hostHeaders([`${subDomain}.${hostedZone}`])],
    })

    new ApplicationListenerCertificate(this, 'ServiceALBListenerCertificate', {
      listener,
      certificates: [
        ListenerCertificate.fromArn(
          StringParameter.valueFromLookup(this, '/owna/cluster/acm_cert_arn'),
        ),
      ],
    })

    const dnsRecord = new RecordSet(this, 'DNSRecord', {
      recordType: RecordType.A,
      recordName: `${subDomain}.${hostedZone}.`,
      zone: HostedZone.fromHostedZoneAttributes(this, 'HostedZone', {
        hostedZoneId,
        zoneName: hostedZone,
      }),
      target: RecordTarget.fromAlias({
        bind: () => ({
          dnsName: Fn.importValue(`${appEnv}-owna-alb-ExternalLoadbalancerDNSName`),
          hostedZoneId: Fn.importValue(
            `${appEnv}-owna-alb-ExternalLoadbalancerHostedZoneId`,
          ),
        }),
      }),
    })

    const scalableTarget = new ScalableTarget(this, 'AutoScalingTarget', {
      serviceNamespace: ServiceNamespace.ECS,
      minCapacity: 1,
      maxCapacity: 3,
      resourceId: `service/${clusterName}/${apiName}`,
      role: autoScalingRole,
      scalableDimension: 'ecs:service:DesiredCount',
    })

    scalableTarget.node.addDependency(service)

    new TargetTrackingScalingPolicy(this, 'AutoScalingPolicy', {
      scalingTarget: scalableTarget,
      targetValue: 65,
      policyName: `owna-${apiName}-autoscaling-policy`,
      scaleInCooldown: Duration.seconds(60),
      scaleOutCooldown: Duration.seconds(90),
      predefinedMetric: PredefinedMetric.ECS_SERVICE_AVERAGE_CPU_UTILIZATION,
    })

    new CfnOutput(this, 'Endpoint', {
      value: `https://${dnsRecord.domainName}`,
    })
  }
}
