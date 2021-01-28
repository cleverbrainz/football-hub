// The Cloud Functions for Firebase SDK to create Cloud Functions and setup triggers.
const functions = require('firebase-functions')
const express = require('express')
const app = express()
const { db, admin } = require('./utils/admin')
const moment = require('moment')
const cors = require('cors')
const stripe = require('stripe')('sk_test_4eC39HqLyjWDarjtT1zdp7dc')
const bodyParser = require('body-parser');
app.use(cors())
app.use(express.static('.'))
// Middleware for authentication
const authMiddleware = require('./utils/authMiddleware')
const {
  getAllCompanies,
  postNewCompany,
  addNewDetail,
  editCompanyDetail,
  // uploadCoachDocument,
  dataDeletion,
  // uploadCompanyDocument,
  // updateUserInformation,
  // editCompanyLocation,
  ageDetails,
  coachImageUpload,
  filterListings,
  sendCoachRequest,
  deleteCoachRequest,
  addSelfToCoaches,
  addPlayerToCourse,
  addPlayerToList,
  getAllListings,
  getSingleCourse,
  updateRegister,
  updateCourseCoaches,
  uploadCompanyDocument,
  sendPlayerRequestEmail,
  retrieveCompanyCourses,
  sendCoachRequestEmail
} = require('./utils/controllers/companyController')
const { 
  createStripePayment, 
  retrieveConnectedAccount,
  webhookCourseBooking } = require('./utils/controllers/paymentController')
const {
  newEnquiry,
  getEnquiries,
  updateOneEnquiry,
  preRegistrationEnquiry
} = require('./utils/controllers/enquiryController')
const {
  adminPageEdits,
  getAdminPageDetails,
  getVerifications,
  acceptAwaitingVerification
} = require('./utils/controllers/adminController')
const {
  loginUser,
  registerUser,
  customerImageUpload,
  imageDeletion,
  getOneUser,
  // updateCompanyListingInformation,
  getCompaniesAndCoaches,
  forgottenPassword,
  userDocumentUpload,
  initialRegistrationUserInformation,
  updateUserDetails,
  searchForPlayers
} = require('./utils/controllers/userController')
const {
  // acceptCompanyRequest,
  handleCompanyRequest,
  uploadCoachDocument,
  searchForCoaches
  // getAllAppCoaches
} = require('./utils/controllers/coachController')
const { 
  getAllPlans, 
  createNewSubscription, 
  createConnectedAccount, 
  handleWebhook, 
  createEditAccountLink } = require('./utils/controllers/stripeController')
// const { checkPubSub } = require('./utils/cloudfunctions')
// Cloud functios and routes for companies collection
app.get('/masterlists', getCompaniesAndCoaches)
app.get('/companies', getAllCompanies)
app.post('/companies', postNewCompany)
// app.post('/companies/location', authMiddleware, editCompanyLocation)
app.post('/companies/age', authMiddleware, ageDetails)
app.patch('/companies/age', authMiddleware, ageDetails)
app.patch('/companies/array/:detail', authMiddleware, editCompanyDetail)
app.post('/companies/:detail', addNewDetail)
app.patch('/companies/addSelfCoach', authMiddleware, addSelfToCoaches)
app.patch('/companies/:companyId/players', authMiddleware, addPlayerToList)
app.patch(
  '/companies/:id/document/:documentType',
  authMiddleware,
  uploadCompanyDocument
)
app.get('/coaches/search/:query', searchForCoaches)
app.post('/coaches/image/:id', authMiddleware, coachImageUpload)
app.patch(
  '/coaches/:id/document/:documentType',
  authMiddleware,
  uploadCoachDocument
)
// app.patch('/company/:id/document', authMiddleware, uploadCompanyDocument)
app.delete('/companies/:detail/:id', authMiddleware, dataDeletion)
app.post('/filteredCompanies', filterListings)
app.get('/listings', getAllListings)
app.get('/courses/:courseId', getSingleCourse)
app.patch('/courses/:courseId/players', addPlayerToCourse)
app.patch('/courses/:courseId/coaches', updateCourseCoaches)
app.patch('/courses/:courseId', updateRegister)
// enquiries
app.post('/enquiries', newEnquiry)
// app.get('/enquiries/:company', authMiddleware, getCompanyEnquiry)
app.get('/enquiries/:category', authMiddleware, getEnquiries)
app.patch('/enquiries/:id', updateOneEnquiry)
app.post('/preSignUpEnquiry', preRegistrationEnquiry)
// Cloud functions and routes for user collection
app.delete('/user/image/:id', authMiddleware, imageDeletion)
app.post('/user/:id/image', authMiddleware, customerImageUpload)
app.post('/user/:id/signup', initialRegistrationUserInformation)
app.post('/user/document', authMiddleware, userDocumentUpload)
app.get('/users/:id', getOneUser)
app.get('/players/search/:query', searchForPlayers)
app.patch('/users/:id', authMiddleware, updateUserDetails)
// app.post('/user/:id', authMiddleware, updateCompanyListingInformation)
app.post('/signup', registerUser)
app.post('/login', loginUser)
// app.get('/allCoaches', getAllAppCoaches)
app.post('/user/:id/request', sendCoachRequest)
app.put('/user/:id/deleterequest', deleteCoachRequest)
app.put('/user/:id/requests', handleCompanyRequest)
app.post('/resetpassword', forgottenPassword)
// app.get('/users/:id', getOneUser)
app.get('/admin/awaitingVerification', getVerifications)
app.put('/admin/awaitingVerification/:id', acceptAwaitingVerification)
app.post('/admin/:id', adminPageEdits)
app.get('/admin/:id', getAdminPageDetails)
app.post('/emailRequest', sendPlayerRequestEmail)
app.post('/emailRequestCoach', sendCoachRequestEmail)
app.post('/retrieveCourse', retrieveCompanyCourses)
app.post('/create-payment', createStripePayment)

app.post('/webhook-course-booking', webhookCourseBooking)

app.get('/plans', getAllPlans)
app.post('/subscriptions/new', createNewSubscription)
app.post('/connectAccount/new', createConnectedAccount)
app.post('/connectAccount/edit', createEditAccountLink)

app.post('/stripewebhook', handleWebhook)

app.get('/connected-account/:id', retrieveConnectedAccount)
// app.get('/subscriptions/portal', getPortal)
// Configures firebase and lets it know that the app container is serving the functionalities
exports.api = functions.region('europe-west2').https.onRequest(app)

// exports.checkPubSub = functions.pubsub.schedule('every 10 minutes')
//   .timeZone('Europe/London')
//   .onRun((context) => {
//     const time = new Date().toTimeString()
//     console.log('pubsub', time)
//     return null
//   })
async function getData(activeCourseArray) {
  const activePlayers = []
  const expiredCourses = []
  const expiredCourseIds = []
  let courseCompanyId = ''
  for await (const course of activeCourseArray) {
    
    const courseRef = await db.doc(`/courses/${course.courseId}`).get()
    if (courseRef.exists) {
      
      const courseInfo = courseRef.data()
      // console.log(courseInfo)
      const { playerList, companyId, courseDetails } = courseInfo
      courseCompanyId = companyId
      console.log(companyId, courseInfo.courseId, playerList)
      const end =
        courseDetails.courseType === 'Camp'
          ? courseDetails.lastDay
          : courseDetails.endDate
      if (moment(end).isBefore(moment(), 'day')) {
        console.log('course expired')
        const courseExpiredPlayerIds = playerList ? playerList : []
        const coaches = courseInfo.coaches ? courseInfo.coaches : []
        expiredCourses.push(course)
        expiredCourseIds.push(course.courseId)
        // expiredCoursesPlayerList.concat(courseExpiredPlayerIds)
        await courseExpiredPlayerIds.forEach((player) => {
          db.doc(`users/${player}`).update({
            [`courses.${companyId}.active`]: admin.firestore.FieldValue.arrayRemove(
              course.courseId
            ),
            [`courses.${companyId}.past`]: admin.firestore.FieldValue.arrayUnion(
              course.courseId
            )
          })
        })
        await coaches.forEach((coach) => {
          if (coach === companyId) {
            db.doc(`users/${coach}`).update({
              [`coursesCoaching.active.${companyId}`]: admin.firestore.FieldValue.arrayRemove(
                course
              ),
              [`coursesCoaching.past.${companyId}`]: admin.firestore.FieldValue.arrayUnion(
                course
              )
            })
          } else {
            db.doc(`users/${coach}`).update({
              [`courses.active.${companyId}`]: admin.firestore.FieldValue.arrayRemove(
                course
              ),
              [`courses.past.${companyId}`]: admin.firestore.FieldValue.arrayUnion(
                course
              )
            })
          }
        })
        // db.doc(`/users/${companyData.userId}`).update({
        //   'courses.active': admin.firestore.FieldValue.arrayRemove(course),
        //   'courses.past': admin.firestore.FieldValue.arrayUnion(course)
        // })
      } else {
        playerList
          ? playerList.forEach(player => activePlayers.push(player))
          : console.log('no players listed yet')
        console.log('course active')
      }
    }
  }
  console.log(courseCompanyId, activePlayers, expiredCourses, expiredCourseIds)
  return [activePlayers, expiredCourses, expiredCourseIds]
}
exports.scheduledUpdateStatuses = functions.pubsub
  .schedule('48 10 * * *')
  .timeZone('Europe/London')
  .onRun(async () => {
    db.collection('/users')
      .where('category', '==', 'company')
      .get()
      .then((data) => {
        data.forEach((company) => {
          // const activePlayers = []
          // const expiredCourses = []
          // const expiredCourseIds = []
          // const promises = []
          // const expiredCoursesPlayerList = []
          const companyData = company.data()
          // console.log(companyData)
          // console.log(companyData.courses, typeof companyData.courses)
          const activeCourseArray = companyData.courses.active
            ? companyData.courses.active : companyData.courses ? companyData.courses : []
          // const  = getData(
          //   activeCourseArray
          // )
          getData(activeCourseArray).then(
            ([activePlayers, expiredCourses, expiredCourseIds]) => {
              // console.log('comp Players', companyData.players)
              console.log('then')
              const previousList = {}
              for (const player of Object.keys(companyData.players)) {
                previousList[player] = companyData.players[player]
                previousList[player].status =
                  previousList[player].status === 'Active'
                    ? 'Inactive'
                    : previousList[player].status
              }
              const inactivePlayers = companyData.inactivePlayers
                ? companyData.inactivePlayers
                : {}
              const updatedActiveCourses = activeCourseArray.filter(
                (course) => !expiredCourseIds.includes(course.courseId)
              )
              const updatedPastCourses = companyData.courses.past
                ? companyData.courses.past.concat(expiredCourses)
                : expiredCourses
              // console.log('active', activePlayers, 'list', previousList)
              Array.from(new Set(activePlayers)).forEach((player) => {
                previousList[player].status = 'Active'
                if (inactivePlayers[player]) {
                  delete inactivePlayers[player]
                }
              })
              // console.log('previous', companyData.players, previousList)
              const toFilter = Object.keys(previousList).filter(
                (player) => previousList[player].status === 'Inactive'
              )
              // console.log('toFilter', toFilter)
              toFilter.forEach((player) => {
                if (!inactivePlayers[player]) {
                  inactivePlayers[player] = moment()
                } else {
                  if (moment().diff(inactivePlayers[player], 'days') > 30) {
                    previousList[player].status = 'Past'
                  }
                }
              })
              db.doc(`/users/${companyData.userId}`).update({
                playerList: previousList,
                'courses.active': updatedActiveCourses,
                'courses.past': updatedPastCourses,
                inactivePlayers: inactivePlayers
              })
            }
          )
        })
      })
      .catch((err) => console.log(err))
    return null
  })