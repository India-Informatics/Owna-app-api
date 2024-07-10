import { Construct } from 'constructs'

export function getContext<ReturnType = string>(
  scope: Construct,
  key: string
): ReturnType {
  const value = scope.node.tryGetContext(key) as ReturnType | undefined

  if (!value) {
    throw new Error(
      `Could not find \`${key}\` for \`${scope.node.path}\`. Make sure that the context value has been correctly passed to the \`App\` constructor.`
    )
  }

  return value
}
