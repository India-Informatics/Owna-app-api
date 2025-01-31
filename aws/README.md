# Welcome to your CDK TypeScript project

This is a blank project for CDK development with TypeScript.

The `cdk.json` file tells the CDK Toolkit how to execute your app.

## Useful commands

- `npm run build` compile typescript to js
- `npm run watch` watch for changes and compile
- `npm run test` perform the jest unit tests
- `cdk deploy` deploy this stack to your default AWS account/region
- `cdk diff` compare deployed stack with current state
- `cdk synth` emits the synthesized CloudFormation template

## Steps

1. `cd aws`
2. `direnv alow`
3. `yarn`
4. Setup `aws-vault exec soltadev -- yarn cdk synth`
5. Transpile `aws-vault exec soltadev -- yarn cdk bootstrap`
6. Deploy `aws-vault exec soltadev -- yarn cdk deploy`
