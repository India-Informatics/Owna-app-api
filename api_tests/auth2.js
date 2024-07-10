import { Amplify, Auth, Hub } from 'aws-amplify'
import config from 'config'

export class Authenticator {
  accessToken = ''
  idToken = ''

  async configure() {
    const opts = {
      region: config.get('awsConfiguration.region'),
      userPoolId: config.get('awsConfiguration.userPoolId'),
      userPoolWebClientId: config.get('awsConfiguration.userPoolWebClientId'),
    }

    return Amplify.configure(opts)
  }

  async signIn() {
    try {
      const username = config.get('userCredentials.username')
      const password = config.get('userCredentials.password')

      const res = await Auth.signIn({ username, password })
      this.accessToken = res.signInUserSession.accessToken.jwtToken
      this.idToken = res.signInUserSession.idToken.jwtToken
    } catch (error) {
      console.log('error signing in', error)
    }
  }
}
