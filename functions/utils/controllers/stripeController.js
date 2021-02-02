const { db, admin, functions } = require('../admin')
const Stripe = require('stripe')
const { user } = require('firebase-functions/lib/providers/auth')
const moment = require('moment')
const { sendEmailNotificationCompany, sendEmailNotificationPlayer } = require('./notificationController')

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

        if (data.name === 'Standard Membership')
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
    case 'payment_intent.succeeded': {
      const paymentIntent = event.data.object
      const { metadata } = paymentIntent

      if (metadata.courseId) {
        addPlayerToCourse(metadata)
      }

      break
    }
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


const createRegister = (startDate, endDate, sessionDays, playerList) => {
  const sessions = []
  let date = moment(startDate)
  const endMoment = moment(endDate)

  while (date.isSameOrBefore(endMoment)) {
    console.log(date.day())
    if (sessionDays.some((day) => day === date.day())) {
      // console.log(date.day())
      sessions.push(date.format('YYYY-MM-DD'))
    }
    // console.log(date)
    date = date.add(1, 'days')
  }
  const register = { sessions }

  for (const player of playerList) {
    register[player.id] = { name: player.name, age: player.dob, id: player.id }
    for (const date of sessions) {
      register[player.id][date] = { attendance: false, notes: '' }
    }
  }

  console.log(sessions, register)
  return register
}

const addUsersToRegister = (register, newAdditions) => {
  for (const player of newAdditions) {
    register[player.id] = { name: player.name }
    for (const date of register.sessions) {
      register[player.id][date] = { attendance: false, notes: '' }
    }
  }
  return register
}

const addPlayerToCourse = (metadata) => {
  const { courseId, playerId, dob, name } = metadata
  const courseRef = db.doc(`/courses/${courseId}`)
  const playerRef = db.doc(`users/${playerId}`)

  console.log('step 1')

  return courseRef
    .update({
      playerList: admin.firestore.FieldValue.arrayUnion(playerId)
    })
    .then(() => {
      console.log('step 2')
      courseRef
        .get()
        .then((data) => {
          const courseData = data.data()
          const { register, courseDetails } = courseData
          const dayNums =
            courseDetails.courseType === 'Camp'
              ? courseDetails.sessions.map((session) =>
                // console.log(session.sessionDate, moment(session.sessionDate.toDate()).day())
                moment(session.sessionDate.toDate()).day()
              )
              : courseDetails.sessions.map((session) =>
                // console.log(session.sessionDate, moment(session.sessionDate.toDate()).day())
                moment().day(session.day).day()
              )
          console.log({ dayNums })
          const newRegister = register
            ? addUsersToRegister(register, [
              {
                name,
                id: playerId,
                dob
              }
            ])
            : courseDetails.courseType === 'Camp'
              ? createRegister(
                courseDetails.firstDay,
                courseDetails.lastDay,
                dayNums,
                [
                  {
                    name,
                    id: playerId,
                    dob
                  }
                ]
              )
              : createRegister(
                courseDetails.startDate,
                courseDetails.endDate,
                dayNums,
                [
                  {
                    name,
                    id: playerId,
                    dob
                  }
                ]
              )

          courseRef.update({
            register: newRegister
          })
          return courseData
        })
        .then((data) => {
          console.log('step 3')
          const { companyId, courseId } = data
          playerRef.update({
            [`courses.${companyId}.active`]: admin.firestore.FieldValue.arrayUnion(
              courseId
            )
          })
          console.log('step 4')
          db.doc(`/users/${companyId}`)
            .update({
              [`players.${playerId}.status`]: 'Active'
            })
            .then(() => {
              console.log('player added to course')
              sendEmailNotificationCompany('newPlayerCourseSignUp', { recipientId: companyId }, { contentName: name, contentCourse: data.courseDetails.optionalName })
              sendEmailNotificationPlayer('bookingConfirmation', { recipientId: playerId }, { contentName: name, contentCourse: data.courseDetails.optionalName })
            })
        })
        .catch((err) => console.log(err))
    })
}
