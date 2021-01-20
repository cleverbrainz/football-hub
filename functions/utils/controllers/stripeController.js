const { db, admin, functions } = require('../admin')
const Stripe = require('stripe')
const { user } = require('firebase-functions/lib/providers/auth')

// const config = require('../configuration')

exports.getAllPlans = (req, res) => {
  const promises = []
  const products = []

  db.collection('/products')
    .get()
    .then((snapshot) => {
      snapshot.forEach((item) => {
        const prices = []
        const data = item.data()
        data.prices = {}
        // console.log(item.id)

        if (data.active)
          promises.push(
            db
              .doc(`/products/${item.id}`)
              .collection('prices')
              .get()
              .then((subItems) => {
                // console.log(subItems)
                // subItems.forEach((subItem) => prices.push(subItem.data()))
                subItems.forEach(
                  (subItem) => (data.prices[subItem.id] = subItem.data())
                )
                // data.prices = prices
                console.log(data)
                products.push(data)
              })
          )
      })
      Promise.all(promises).then(() => {
        console.log('promises', promises)
        res.status(200).json(products)
      })
    })

    .catch((err) => console.log(err))
}

exports.createNewSubscription = (req, res) => {
  const { userId, price, url } = req.body
  return db
    .doc(`/users/${userId}`)
    .collection('checkout_sessions')
    .add({
      price: price,
      success_url: url,
      cancel_url: url,
    })
    .then((docRef) => {
      docRef.onSnapshot((snap) => {
        const { error, sessionId } = snap.data()
        if (error) {
          return res.status(404).json({ error: 'an Error has occured' })
        }
        if (sessionId) {
          return res.status(200).json({ sessionId })
        }
      })
    })
}

exports.createConnectedAccount = (req, res) => {
  const stripe = Stripe('sk_test_9uKugMoJMmbu03ssvVn9KXUE')

  return stripe.accounts
    .create({
      country: 'GB',
      type: 'express',
      capabilities: {
        card_payments: {
          requested: true,
        },
        transfers: {
          requested: true,
        },
      },
      metadata: {
        firebaseUID: req.body.userId,
      },
    })
    .then((account) => {
      console.log('account', account)

      db.doc(`/users/${req.body.userId}`)
        .get()
        .then((data) => {
          const userData = data.data()
          if (userData.listings && userData.listings.length > 0) {
            const updated = userData.listings.map((listing) => {
              return { ...listing, accountId: account.id }
            })
            db.doc(`/users/${req.body.userId}`).update({ listings: updated })
          }
          db.doc(`/users/${req.body.userId}`)
            .collection('stripe_account')
            .add({ ...account })
            .then(() => {
              return stripe.accountLinks
                .create({
                  account: account.id,
                  refresh_url: 'http://localhost:3000/subscription',
                  return_url: 'http://localhost:3000/subscription',
                  type: 'account_onboarding',
                })
                .then((accountLink) => {
                  return res.status(200).json(accountLink)
                })
            })
        })
    })
    .catch((err) => {
      console.log(err)
      return res.status(401).json(err)
    })
}

exports.createEditAccountLink = (req, res) => {
  const stripe = Stripe('sk_test_9uKugMoJMmbu03ssvVn9KXUE')

  return stripe.accounts
    .createLoginLink(req.body.accountId)
    .then((accountLink) => {
      return res.status(200).json(accountLink)
    })
    .catch((err) => {
      console.log(err)
      return res.status(401).json(err)
    })
}

const handleStripeAccountUpdate = (account) => {
  const { firebaseUID } = account.metadata

  return db
    .doc(`users/${firebaseUID}`)
    .collection('stripe_account')
    .where('id', '==', account.id)
    .get()
    .then((snap) => {
      snap.forEach((item) => {
        console.log('updating', item.id)
        return db
          .doc(`users/${firebaseUID}`)
          .collection('stripe_account')
          .doc(`${item.id}`)
          .update({ ...account })
          .then((write) => {
            console.log('writeres', write)
            return
          })
      })
    })
}

// exports.getPortal = (req, res) => {
//   functions.region('europe-west2').https.onCall('ext-firestore-stripe-subscriptions-createPortalLink')({ returnUrl: 'http://localhost:3000/tester' })
//     .then(data => {
//       console.log(data)
//       res.status(200).json(data)
//     })
//     .catch(err => console.log(err))
// }

exports.handleWebhook = (req, res) => {
  let event
  try {
    event = req.body
  } catch (err) {
    console.log('⚠️  Webhook error while parsing basic request.', err.message)
    return res.send()
  }
  // Handle the event
  switch (event.type) {
    case 'payment_intent.succeeded':
      const paymentIntent = event.data.object
      console.log(`PaymentIntent for ${paymentIntent.amount} was successful!`)
      // Then define and call a method to handle the successful payment intent.
      // handlePaymentIntentSucceeded(paymentIntent);
      break
    case 'payment_method.attached':
      const paymentMethod = event.data.object
      // Then define and call a method to handle the successful attachment of a PaymentMethod.
      // handlePaymentMethodAttached(paymentMethod);
      break
    case 'account.updated':
      const account = event.data.object
      console.log('account yep', account)
      handleStripeAccountUpdate(account)
      break
    case 'capability.updated':
      const capability = event.data.object
      console.log('capability', capability)
      break

    default:
      // Unexpected event type
      console.log(`Unhandled event type ${event.type}.`)
  }
  // Return a 200 response to acknowledge receipt of the event
  return res.send()
}
