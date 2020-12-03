// The Cloud Functions for Firebase SDK to create Cloud Functions and setup triggers.
const functions = require('firebase-functions')
const app = require('express')()
// const db = require('./utils/admin')

const cors = require('cors')({ origin: '*' })
app.use(cors)

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
  updateCourseCoaches
} = require('./utils/controllers/companyController')

const {
  newEnquiry,
  getEnquiries,
  updateOneEnquiry,
  preRegistrationEnquiry
} = require('./utils/controllers/enquiryController')

const { adminPageEdits,
  getAdminPageDetails, getVerifications, acceptAwaitingVerification } = require('./utils/controllers/adminController')

const {
  loginUser,
  registerUser,
  customerImageUpload,
  imageDeletion,
  getOneUser,
  // updateCompanyListingInformation,
  forgottenPassword,
  userDocumentUpload,
  initialRegistrationUserInformation,
  updateUserDetails
} = require('./utils/controllers/userController')

const {
  // acceptCompanyRequest,
  handleCompanyRequest,
  uploadCoachDocument,
  searchForCoaches
  // getAllAppCoaches
} = require('./utils/controllers/coachController')
// const { checkPubSub } = require('./utils/cloudfunctions')


// Cloud functios and routes for companies collection
app.get('/companies', getAllCompanies)
app.post('/companies', postNewCompany)
// app.post('/companies/location', authMiddleware, editCompanyLocation)
app.post('/companies/age', authMiddleware, ageDetails)
app.patch('/companies/age', authMiddleware, ageDetails)
app.patch('/companies/array/:detail', authMiddleware, editCompanyDetail)
app.post('/companies/:detail', addNewDetail)
app.patch('/companies/addSelfCoach', authMiddleware, addSelfToCoaches)
app.patch('/companies/:companyId/players', authMiddleware, addPlayerToList)
app.get('/coaches/search/:query', searchForCoaches)
app.post('/coaches/image/:id', authMiddleware, coachImageUpload)
app.patch('/coaches/:id/document/:documentType', authMiddleware, uploadCoachDocument)
// app.patch('/company/:id/document', authMiddleware, uploadCompanyDocument)
app.delete('/companies/:detail/:id', authMiddleware, dataDeletion)

app.post('/filteredCompanies', filterListings )

app.get('/listings', getAllListings)

app.get('/courses/:courseId', getSingleCourse)
app.patch('/courses/:courseId/players', authMiddleware, addPlayerToCourse)
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

app.patch('/users/:id', authMiddleware, updateUserDetails)
// app.post('/user/:id', authMiddleware, updateCompanyListingInformation)

app.post('/signup', registerUser)
app.post('/login', loginUser)

// app.get('/allCoaches', getAllAppCoaches)

app.post('/user/:id/request', sendCoachRequest)
app.put('/user/:id/deleterequest', deleteCoachRequest)
app.put('/user/:id/requests', handleCompanyRequest)

// app.get('/users', getAllUsers)
app.post('/resetpassword', forgottenPassword)
// app.get('/users/:id', getOneUser)

app.get('/admin/awaitingVerification', getVerifications)
app.put('/admin/awaitingVerification/:id', acceptAwaitingVerification)
app.post('/admin/:id', adminPageEdits)
app.get('/admin/:id', getAdminPageDetails)

// Configures firebase and lets it know that the app container is serving the functionalities
exports.api = functions.region('europe-west2').https.onRequest(app)

exports.checkPubSub = functions.pubsub.schedule('every 10 minutes')
  .timeZone('Europe/London')
  .onRun((context) => {
    const time = new Date().toTimeString()
    console.log('pubsub', time)
    return null
  })