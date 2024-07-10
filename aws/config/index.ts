import envConfig from 'config'

export const config = {
  region: envConfig.get<string>('region'),
  profile: envConfig.get<string>('profile'),
  accountId: envConfig.get<string>('accountId'),
  hostedZone: envConfig.get<string>('hostedZone'),
  hostedZoneId: envConfig.get<string>('hostedZoneId'),
  vpcId: envConfig.get<string>('vpcId'),
  ecrRepoName: envConfig.get<string>('ecrRepoName'),
  email: envConfig.get<{
    sendFrom: string
    sendFromName: string
  }>('email'),
}
