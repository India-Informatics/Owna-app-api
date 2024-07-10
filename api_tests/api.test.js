/* eslint-disable @typescript-eslint/no-empty-function */
import { Types } from 'mongoose'
import request from 'supertest'

import { Authenticator } from './auth2'

function generateUniqueId() {
  const timestamp = Date.now().toString(36)
  const random = Math.random().toString(36).substr(2, 9) // Generate a random string of length 9 (adjust as needed)
  return timestamp + random
}

test('Top up owna account and buy blocks flow', async () => {
  // AUTHENTICATION
  const auth = new Authenticator()
  await auth.configure()
  setTimeout(() => {}, 2000)
  await auth.signIn()
  const { accessToken, idToken } = auth

  // TOP UP
  const paymentIntentPayload = {
    idempotencyKey: generateUniqueId(),
    payer: {
      paymentApplicationType: 'wallet',
      id: '64598b606d3ebb0023f762d4',
    },
    payee: {
      paymentApplicationType: 'wallet',
      address: {
        line1: '123 Main St',
        city: 'Anytown',
        state: 'CA',
        postalCode: '12345',
        countryCode: 'US',
      },
      integrationCode: 'test123',
      id: '64598b606d3ebb0023f762d4',
    },
    initiatedBy: 'payer',
    funds: {
      amount: 300.0,
      currency: {
        code: 'USD',
        exponent: 2,
        base: 10,
      },
      scale: 1,
    },
    sourceOfFunds: {
      classification: 'bank_account',
      methodData: {
        // Real bank account, only uncomment when testing capture
        // bankAccountId: '642b61be766cff00232839b0',
        bankAccountId: '64587bce09994a0023e6c329',
      },
    },
    destinationOfFunds: {
      classification: 'bank_account',
      methodData: {
        // Real bank account, only uncomment when testing capture
        // bankAccountId: '642b61be766cff00232839b1',
        bankAccountId: '644606390bb8928b098e5f9c',
      },
    },
    note: 'Test payment',
  }

  // Creating payment intent for top up
  const res = await request('https://pay.api.soltalabs.dev')
    .put('/payment-intents')
    .set('Authorization', `Bearer ${accessToken}`)
    .set('id-token', idToken)
    .set('paycloud-terminal-id', 'testterminalId')
    .set('paycloud-merchant-id', 'merchantId123')
    .send(paymentIntentPayload)
    .expect(201)

  // Checking if the created payment intent created a transaction
  await request('https://pay.api.soltalabs.dev')
    .get(`/payment-intents/${res.body.id}`)
    .set('Authorization', `Bearer ${accessToken}`)
    .set('id-token', idToken)
    .set('paycloud-terminal-id', 'testterminalId')
    .set('paycloud-merchant-id', 'merchantId123')
    .send(paymentIntentPayload)
    .expect(200)
    .expect((response) => {
      const intentId = response.body.id
      if (res.body.id !== intentId) {
        throw new Error('UserId found does not match the user id of most recent intent')
      }
    })

  // TODO: Make a way to test this without using real bank accounts
  // Capture Created payment
  // await request('https://pay.api.soltalabs.dev')
  //   .put(`/payment-intents/${res.body.id}/capture`)
  //   .set('Authorization', `Bearer ${accessToken}`)
  //   .set('id-token', idToken)
  //   .expect(200)

  // BUY BLOCK

  const blockBody = {
    userId: '64598b606d3ebb0023f762d4',
    propertyId: '64c3035d621f63206d16d23c',
    numberOfBlocks: parseInt(1, 10),
  }

  // Create a order for blocks
  const order = await request('https://owna.api.soltalabs.dev')
    .post(`/orders`)
    .set('Authorization', `Bearer ${accessToken}`)
    .set('id-token', idToken)
    .send(blockBody)
    .expect(201)

  const transactionBody = {
    transactionDate: new Date().toISOString(),
    amount: 1,
    origin: 'account',
    merchantName: 'owna',
    transactionType: 'other',
    description: 'Block purchase',
    accountId: '644606390bb8928b098e5f9c',
    shouldAdjustBalance: true,
  }

  // Create transaction for order
  await request('https://financials.api.soltalabs.dev')
    .post(`/banking/transactions`)
    .set('Authorization', `Bearer ${accessToken}`)
    .set('id-token', idToken)
    .send(transactionBody)
    .expect(204)

  // Capturing order and turning it to a block
  await request('https://owna.api.soltalabs.dev')
    .post(`/orders/${order.body._id}/capture`)
    .set('Authorization', `Bearer ${accessToken}`)
    .set('id-token', idToken)
    .send(blockBody)
    .expect(201)
})
