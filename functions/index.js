// The Cloud Functions for Firebase SDK to create Cloud Functions and setup triggers.
const functions = require('firebase-functions')
const app = require('express')()

const cors = require('cors')
app.use(cors())

// Middleware for authentication
const authMiddleware = require('./utils/authMiddleware')
const {
  getAllCompanies,
  postNewCompany,
  addNewDetail,
  editCompanyDetail,
  uploadCoachDocument,
  dataDeletion,
  uploadCompanyDocument,
  updateUserInformation,
  editCompanyLocation,
  addAgeDetail,
  coachImageUpload,
  filterListingCompanies,
  sendCoachRequest,
  deleteCoachRequest,
} = require('./utils/controllers/companyController')

const {
  newEnquiry,
  getEnquiries,
  updateOneEnquiry,
  preRegistrationEnquiry
} = require('./utils/controllers/enquiryController')

const { adminPageEdits,
  getAdminPageDetails } = require('./utils/controllers/adminController')

const {
  loginUser,
  registerUser,
  customerImageUpload,
  imageDeletion,
  getOneUser,
  updateCompanyListingInformation,
  forgottenPassword,
  userDocumentUpload,
  initialRegistrationUserInformation,
} = require('./utils/controllers/userController')

const {
  acceptCompanyRequest,
  handleCompanyRequest
} = require('./utils/controllers/coachController')

// Cloud functios and routes for companies collection
app.get('/companies', getAllCompanies)
app.post('/companies', postNewCompany)
// app.post('/companies/location', authMiddleware, editCompanyLocation)
app.post('/companies/age', authMiddleware, addAgeDetail)
app.patch('/companies/array/:detail', authMiddleware, editCompanyDetail)
app.post('/companies/:detail', addNewDetail)
app.patch('/companies/:id', authMiddleware, updateUserInformation)
app.post('/coaches/image/:id', authMiddleware, coachImageUpload)
app.patch('/coaches/document/:documentType/:id', authMiddleware, uploadCoachDocument)
// app.patch('/company/:id/document', authMiddleware, uploadCompanyDocument)
app.delete('/companies/:detail/:id', authMiddleware, dataDeletion)

app.post('/filteredCompanies', filterListingCompanies )

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
app.post('/user/:id', authMiddleware, updateCompanyListingInformation)

app.post('/signup', registerUser)
app.post('/login', loginUser)

app.post('/user/:id/request', sendCoachRequest)
app.put('/user/:id/deleterequest', deleteCoachRequest)
app.put('/user/:id/requests', handleCompanyRequest)

// app.get('/users', getAllUsers)
app.post('/resetpassword', forgottenPassword)
// app.get('/users/:id', getOneUser)

app.post('/admin/:id', adminPageEdits)
app.get('/admin/:id', getAdminPageDetails)

// Configures firebase and lets it know that the app container is serving the functionalities
exports.api = functions.region('europe-west2').https.onRequest(app)
