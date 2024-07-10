// eslint-disable-next-line @typescript-eslint/no-var-requires
module.exports = Object.assign(require('./jest.config.ci'), {
  onlyChanged: true,
})
