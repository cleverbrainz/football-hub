// The Cloud Functions for Firebase SDK to create Cloud Functions and setup triggers.
const functions = require('firebase-functions')
const app = require('express')()

const cors = require('cors')
app.use(cors())

// Middleware for authentication
const authMiddleware = require('./utils/authMiddleware')
const { getAllCompanies, postNewCompany } = require('./utils/controllers/companyController')
const { newEnquiry, getEnquiry, updateOneEnquiry } = require('./utils/controllers/enquiryController')
const { loginUser, registerUser, userImageUpload, getOneUser, forgottenPassword, userDocumentUpload } = require('./utils/controllers/userController')

// Cloud functios and routes for companies collection
app.get('/companies', getAllCompanies)
app.post('/companies', postNewCompany)


app.post('/enquiries', newEnquiry)
app.get('/enquiries', authMiddleware, getEnquiry)
app.patch('/enquiries/:id', updateOneEnquiry)

// Cloud functions and routes for user collection
app.get('/users/:id', getOneUser)
app.post('/signup', registerUser)
app.post('/login', loginUser)
app.post('/user/image', authMiddleware, userImageUpload)
app.post('/user/document', authMiddleware, userDocumentUpload)
// app.get('/users', getAllUsers)
app.post('/resetpassword', forgottenPassword)
// app.get('/users/:id', getOneUser)



// Configures firebase and lets it know that the app container is serving the functionalities
exports.api = functions.region('europe-west2').https.onRequest(app)