const stripe = require('stripe')('sk_test_9uKugMoJMmbu03ssvVn9KXUE')
const YOUR_DOMAIN = 'http://localhost:3000/checkout'
const { db, admin } = require('../admin')
const moment = require('moment')



exports.createStripePayment = async (req, res) => {
  const { unitPrice, spaces, product, metadata, accountId, stripeId } = req.body
  const successDomain = 'http://localhost:3000/checkout'

  const session = await stripe.checkout.sessions.create({
    payment_method_types: ['card'],

    line_items: [
      {
        price_data: {
          currency: 'gbp',
          product_data: {
            name: 'helloo',
            images: ['https://images.unsplash.com/photo-1556476874-c98062c7027a?ixid=MXwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHw%3D&ixlib=rb-1.2.1&auto=format&fit=crop&w=1490&q=80']
          },
          unit_amount: unitPrice * 100
        },
        quantity: spaces
      }
    ],
    customer: stripeId,
    payment_intent_data: {
      application_fee_amount: ((unitPrice * 100) * 4) * 0.02,
      on_behalf_of: accountId,
      transfer_data: {
        destination: accountId
      },
      metadata
    },
    mode: 'payment',
    success_url: `${successDomain}?success=true`,
    cancel_url: `${YOUR_DOMAIN}?canceled=true`
  })
  res.json({ id: session.id })
}

exports.webhookCourseBooking = (req, res) => {

  let event
  try {
    event = req.body
  } catch (err) {
    console.log('⚠️  Webhook error while parsing basic request.', err.message)
    return res.send()
  }

  switch (event.type) {
    case 'payment_intent.succeeded': {
      const paymentIntent = event.data.object
      const { metadata } = paymentIntent
      
      addPlayerToCourse(metadata)

      break
    }
    default:

      console.log(`Unhandled event type ${event.type}.`)
  }
  res.status(200).send()
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
            .then(() =>
              console.log('player added to course')
            )
        })
        .catch((err) => console.log(err))
    })
}


