import { App, StackProps as CDKStackProps } from 'aws-cdk-lib'

/**
 * Extends CDK's `StackProps` to make `stackName` and `env` required properties.
 */
export type StackProps = Omit<CDKStackProps, 'env' | 'stackName'> & {
  stackName: string
  env: {
    region: string
    account: string
  }
}

export interface ExtraProps {
  [prop: string]: any
}

export type Context = { appEnv: string }
export type CDKEntrypoint<Config> = (context: Context, config: Config) => App
