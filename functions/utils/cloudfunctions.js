const { report } = require('process')
const { db, admin, functions } = require('./admin')
const config = require('../configuration')
const firebase = require('firebase/app')
const { user } = require('firebase-functions/lib/providers/auth')
// const functions = require('firebase-functions')
const moment = require('moment')
const { createAwaitingVerification } = require('./adminController')

exports.scheduledUpdateStatuses = functions.pubsub.schedule('0 0 * * *')
  .timeZone('Europe/London')
  .onRun((context) => {
    db.collection('/users').where('category', '==', 'company').get()
      .then(data => {
        data.forEach(company => {
          const activePlayers = []
          const expiredCourses = []
          // const expiredCoursesPlayerList = []
          const companyData = company.data()

          companyData.courses.forEach(course => {
            const courseInfo = db.doc(`/courses/${course}`).get()
            const { playerList, companyId, courseDetails } = courseInfo

            if (moment(courseDetails.endDate).isBefore(moment(),'day')) {
              const courseExpiredPlayerIds = Object.keys(playerList)
              console.log('course expired')

              expiredCourses.push(course)
              // expiredCoursesPlayerList.concat(courseExpiredPlayerIds)

              courseExpiredPlayerIds.forEach(player => {
                db.doc(`users/${player}`).update({
                  [`courses.active.${companyId}`]: admin.firestore.FieldValue.arrayRemove(course),
                  [`courses.past.${companyId}`]: admin.firestore.FieldValue.arrayUnion(course)
                })
              })

              // db.doc(`/users/${companyData.userId}`).update({
              //   'courses.active': admin.firestore.FieldValue.arrayRemove(course),
              //   'courses.past': admin.firestore.FieldValue.arrayUnion(course)
              // })

            } else {

              activePlayers.concat(Object.keys(playerList))
              console.log('course active')
              
            }

          }).then(() => {
            const previousList = companyData.players.map(player => player.status = player.status === 'active' ?  'past' : player.status )
            const updatedActiveCourses = companyData.courses.active.filter(course => !expiredCourses.includes(course))
            const updatedPastCourses = companyData.courses.past.concat(expiredCourses)

            new Set(activePlayers).forEach(player => {
              previousList[player].status = 'active'
            })
                        
            db.doc(`/users/${companyData.userId}`).update({
              playerList: previousList,
              'courses.active': updatedActiveCourses,
              'courses.past': updatedPastCourses
            })
          })
        })
      })
      .catch(err => console.log(err))
    return null
  })

// exports.checkPubSub = functions.pubsub.schedule('1 * * * *')
//   .timeZone('Europe/London')
//   .onRun((context) => {
//     console.log('timecheck 18:20pm')
//     return null
//   })