#!/usr/bin/env zx

// Since we want this script to print either an image tag or nothing,
// we disable verbose output to prevent printing output from each sub-command.
$.verbose = false

try {
  const { imageDetails } = JSON.parse(
    await $`aws ecr describe-images ${[
      '--repository-name',
      argv.repository,

      '--image-ids',
      'imageTag=latest',

      '--output',
      'json',

      '--region',
      argv.region,
    ]}`
  )

  if (imageDetails.length === 0) {
    process.exit()
  }

  console.log(imageDetails[0]?.imageTags.find((tag) => tag !== 'latest'))
} catch (error) {
  process.exit()
}
