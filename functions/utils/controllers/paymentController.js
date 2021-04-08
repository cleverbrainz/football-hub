const stripe = require('stripe')('sk_test_9uKugMoJMmbu03ssvVn9KXUE')
const YOUR_DOMAIN = 'https://football-hub-4018a.firebaseapp.com/checkout'
// const YOUR_DOMAIN = 'http://localhost:3000/checkout'
// const YOUR_DOMAIN = 'http://localhost:3000/checkout'
const { db, admin } = require('../admin')
const moment = require('moment')
const { sendEmailNotificationCompany, sendEmailNotificationPlayer } = require('./notificationController')


exports.retrieveProductPrices = async (req, res) => {
  const { id } = req.params
  const prices = await stripe.prices.list({
    product: id,
    limit: 100
  })
  res.send({ prices: prices.data }).status(200)
}

async function stripeCalls(accountId, paginationId) {
  const transfers = await stripe.transfers.list({
    limit: 100,
    destination: accountId,
    ...(paginationId && { starting_after: paginationId })
  })
  return transfers
}



exports.retrieveConnectedAccount = async (req, res) => {

  const { id } = req.params

  db
    .doc(`/listings/${id}`)
    .get()
    .then(async doc => {
      const transferArray = []
      const { accountId } = doc.data()
      let response = await stripeCalls(accountId, '')

      while (response.has_more) {
        const { data } = response
        data.forEach(el => {
          transferArray.push(el)
        })
        response = await stripeCalls(accountId, data[data.length - 1].id)
      }

      response.data.forEach(el => transferArray.push(el))

      const balance = await stripe.balance.retrieve({
        stripeAccount: accountId
      })

      res.send({
        response: {
          transfers: transferArray,
          balance
        }
      }).status(200)
    })
}

exports.createConnectedAccountProductSubscription = async (req, res) => {

  const { customerId, metadata } = req.body
  // const successDomain = 'https://football-hub-4018a.firebaseapp.com/checkout'
  //   const successDomain = 'https://football-hub-4018a.web.app/checkout'

  // console.log(metadata)

  const session = await stripe.checkout.sessions.create({
    payment_method_types: ['card'],
    mode: 'setup',
    metadata,
    customer: customerId,
    success_url: `${YOUR_DOMAIN}?success=true`,
    cancel_url: `${YOUR_DOMAIN}?canceled=true`
  })

  // const successDomain = 'http://localhost:3000/checkout'

  // const cancellation_date = moment(new Date()).add(14, 'd').toDate()


  // const subscription = await stripe.subscriptions.create({
  //   customer: 'cus_IpzDKN7vkp7NH6',
  //   // default_payment_method: intent.payment_method,
  //   default_payment_method: 'pm_1IFR2zIg5fTuA6FVu0rNIY6j',
  //   application_fee_percent: 10,
  //   metadata: {
  //     companyId: 'xPDNFl5ObUcGmx1aaZEyEey2QLa2',
  //     courseId: '12qQNSYLk6M2BiAPGpLf',
  //     playerId: 'Hz5BKzTebVWIbwOfkz6uFbxfOk43',
  //     player_name: 'Kenn Seangpachareonsub'
  //   },
  //   cancel_at: moment(cancellation_date).unix(),
  //   expand: ['latest_invoice.payment_intent'],
  //   items: [
  //     { price: 'price_1IEeMoIg5fTuA6FVgrOyNGah' }
  //   ],
  //   transfer_data: {
  //     destination: 'acct_1IBJHgRIXFwnLyyM'
  //   }
  // })


  // const session = await stripe.checkout.sessions.create({

  //   payment_method_types: ['card'],
  //   line_items: [
  //     { price: 'price_1IEeMoIg5fTuA6FVgrOyNGah' }
  //   ],
  //   // customer: 'cus_IpzDKN7vkp7NH6',
  //   payment_intent_data: subscription,
  //   mode: 'subscription',
  //   success_url: `${successDomain}?success=true`,
  //   cancel_url: `${YOUR_DOMAIN}?canceled=true`
  // })


  res.json({ id: session.id })
}

function calculateProration(start, end, price) {
  const courseDuration = moment(end, 'YYYY-MM-DD').diff(moment(start, 'YYYY-MM-DD'), 'weeks')
  const weeklyPrice = (price.unit_amount / courseDuration).toFixed(2)
  const remainingDuration = moment(end, 'YYYY-MM-DD').diff(moment(), 'weeks')
  const prorationAmount = remainingDuration * weeklyPrice

  return prorationAmount
}


exports.createStripePayment = async (req, res) => {

  const { priceId, metadata, connectedAccountId, customerId, email } = req.body
  const price = await stripe.prices.retrieve(priceId)
  const product = await stripe.products.retrieve(price.product)

  console.log(price)
  const {
    end_date,
    start_date } = price.metadata

  const isTodayBeforeStart = moment().isBefore(moment(start_date, 'YYYY-MM-DD'))

  // const successDomain = 'https://football-hub-4018a.web.app/checkout'
  const prorationAmount = Math.round(calculateProration(start_date, end_date, price))



  const session = await stripe.checkout.sessions.create({
    payment_method_types: ['card'],
    ...(isTodayBeforeStart ?
      {
        line_items: [{
          price: priceId,
          quantity: 1
        }]
      } :
      {
        line_items: [{
          price_data: {
            currency: 'gbp',
            product_data: {
              name: product.name
            },
            unit_amount: prorationAmount
          },
          quantity: 1
        }]
      }),
    customer: customerId,
    payment_intent_data: {
      setup_future_usage: 'off_session',
      application_fee_amount: Math.round(((isTodayBeforeStart ? price.unit_amount : prorationAmount / 100) * 0.02).toFixed(2)),
      on_behalf_of: connectedAccountId,
      transfer_data: {
        destination: connectedAccountId
      },
      metadata,
      receipt_email: email
    },
    mode: 'payment',
    success_url: `${YOUR_DOMAIN}?success=true`,
    cancel_url: `${YOUR_DOMAIN}?canceled=true`
  })
  res.json({ id: session.id })
}


exports.koreanCampApplicationFee = async (req, res) => {

  const { stripeId, email, player_name, locale } = req.body

  console.log('CUSTOMER IDDDD')
  console.log(stripeId)

  const session = await stripe.checkout.sessions.create({
    payment_method_types: ['card'],
    line_items: [{
      price: 'price_1INPKBIg5fTuA6FVMK3BB5hp',
      quantity: 1
    }],
    customer: stripeId,
    metadata: {
      email,
      description: 'Korean application fee'
    },
    payment_intent_data: {
      setup_future_usage: 'off_session',
      receipt_email: email
    },
    mode: 'payment',
    success_url: `https://football-hub-4018a.firebaseapp.com/application/${locale}`,
    // success_url: `localhost:3000/application/${locale}`,
    cancel_url: `${YOUR_DOMAIN}?canceled=true`
  })
  res.json({ id: session.id })
}