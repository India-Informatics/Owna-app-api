export const config = () => ({
  NODE_ENV: process.env.NODE_ENV,
  server: {
    port: parseInt(process.env.SERVER_PORT || '', 10) || 8087,
  },
  db: {
    uri: process.env.DB_URI,
  },
  auth: {
    poolId: process.env.COGNITO_USERPOOL_ID,
    clientId: process.env.COGNITO_CLIENT_ID,
  },
  integration: {
    financialsUrl: process.env.FINANCIALS_URL,
  },
})
