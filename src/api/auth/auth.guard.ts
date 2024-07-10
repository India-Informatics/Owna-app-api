import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { CognitoJwtVerifier } from 'aws-jwt-verify'
import { Request } from 'express'

type User = {
  id: string
  authId: string
  name: string
  email: string
  phoneNumber: string
  emailVerified: boolean
  phoneNumberVerified: boolean
  authTime: number
  authExp: number
}

@Injectable()
export class AuthNGuard implements CanActivate {
  authPoolId: string
  authClientId: string
  user: User | Record<string, never> = {}

  constructor(private configService: ConfigService) {
    if (!this.authPoolId) {
      this.authPoolId = this.configService.get<string>('auth.poolId')
      this.authClientId = this.configService.get<string>('auth.clientId')
    }
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest()
    try {
      const accessToken = this.extractAccessToken(request)
      const idToken = this.extractIdToken(request)

      if (!accessToken || !idToken) throw new UnauthorizedException()

      await this.verifyAccessToken(accessToken)
      await this.verifyIdToken(idToken)

      request.user = this.user
    } catch (error) {
      throw new UnauthorizedException()
    }

    return true
  }

  private async verifyAccessToken(accessToken: string) {
    const verifier = CognitoJwtVerifier.create({
      userPoolId: this.authPoolId,
      clientId: this.authClientId,
      tokenUse: 'access',
    })
    const res = await verifier.verify(accessToken)

    this.user.authId = res.sub
    this.user.authTime = res.auth_time
    this.user.authExp = res.exp
  }

  private async verifyIdToken(idToken: string) {
    const verifier = CognitoJwtVerifier.create({
      userPoolId: this.authPoolId,
      clientId: this.authClientId,
      tokenUse: 'id',
    })
    const res = await verifier.verify(idToken)

    this.user.id = res.user_id as string
    this.user.name = res.name as string
    this.user.phoneNumber = res.phone_number as string
    this.user.email = res.email as string
    this.user.emailVerified = res.email_verified
    this.user.phoneNumberVerified = res.phone_number_verified
  }

  private extractAccessToken(request: Request): string | undefined {
    const [type, token] = request.headers.authorization?.split(' ') ?? []
    return type === 'Bearer' ? token : undefined
  }

  private extractIdToken(request: Request): string | undefined {
    const idToken = request.headers['id-token'] as string

    return idToken
  }
}
