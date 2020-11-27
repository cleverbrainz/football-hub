// const { report } = require('process')
const { db, admin, functions } = require('./admin')
// const config = require('../configuration')
// const firebase = require('firebase/app')
const { user } = require('firebase-functions/lib/providers/auth')
// const functions = require('firebase-functions')
const moment = require('moment')
// const { createAwaitingVerification } = require('./adminController')

exports.scheduledUpdateStatuses = functions.pubsub.schedule('0 0 * *')
  .timeZone('Europe/London')
  .onRun((context) => {
    db.collection('/users').where('category', '==', 'company').get()
      .then(data => {
        data.forEach(company => {
          const activePlayers = []
          const companyData = company.data()
          companyData.courses.forEach(course => {
            const courseInfo = db.doc(`/courses/${course}`).get()
            const { playerList, companyId, courseDetails } = courseInfo
            if (moment(courseDetails.endDate).isBefore(moment(),'day')) {
              console.log('course expired')
              db.doc(`/users/${companyData.userId}`).update({
                'courses.active': admin.firestore.FieldValue.arrayRemove(course),
                'courses.past': admin.firestore.FieldValue.arrayUnion(course)
              })
              Object.keys(playerList).forEach(player => {
                db.doc(`users/${player}`).update({
                  [`courses.active.${companyId}`]: admin.firestore.FieldValue.arrayRemove(course),
                  [`courses.past.${companyId}`]: admin.firestore.FieldValue.arrayUnion(course)
                })
              })
            } else {
              activePlayers.concat(playerList)
              console.log('course active')
            }
          }).then(() => {
            const previousList = companyData.players.map(player => player.status = player.status === 'active' ?  'past' : player.status )
            new Set(activePlayers).forEach(player => {
              previousList[player].status = 'active'
            })
          })
        })
      })
  })

// exports.checkPubSub = functions.pubsub.schedule('1 * * * *')
//   .timeZone('Europe/London')
//   .onRun((context) => {
//     console.log('timecheck 18:20pm')
//     return null
//   })