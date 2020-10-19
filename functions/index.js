// The Cloud Functions for Firebase SDK to create Cloud Functions and setup triggers.
const functions = require("firebase-functions");
const app = require("express")();

const cors = require("cors");
app.use(cors());

// Middleware for authentication
const authMiddleware = require("./utils/authMiddleware");
const {
  getAllCompanies,
  postNewCompany,
  addNewDetail,
  editCompanyDetail,
  uploadCoachDocument,
  dataDeletion,
} = require("./utils/controllers/companyController");

const {
  newEnquiry,
  getCustomerEnquiry,
  getCompanyEnquiry,
  updateOneEnquiry,
} = require("./utils/controllers/enquiryController");

const {
  loginUser,
  registerUser,
  customerImageUpload,
  imageDeletion,
  getOneUser,
  updateUserInformation,
  forgottenPassword,
  userDocumentUpload,
  initialRegistrationUserInformation,
} = require("./utils/controllers/userController");

// Cloud functios and routes for companies collection
app.get("/companies", getAllCompanies);
app.post("/companies", postNewCompany);
app.post("/companies/:detail", addNewDetail);
app.patch("/companies/:detail", authMiddleware, editCompanyDetail);
app.patch("/coaches/:id/document", authMiddleware, uploadCoachDocument);
app.delete("/companies/:detail", authMiddleware, dataDeletion);

app.post("/enquiries", newEnquiry);
app.get("/enquiries/:company", authMiddleware, getCompanyEnquiry);
app.get("/enquiries", authMiddleware, getCustomerEnquiry);

app.patch("/enquiries/:id", updateOneEnquiry);

// Cloud functions and routes for user collection
app.delete("/user/image/:id", authMiddleware, imageDeletion);
app.post("/user/:id/image", authMiddleware, customerImageUpload);
app.post("/user/:id/signup", initialRegistrationUserInformation);

app.post("/user/document", authMiddleware, userDocumentUpload);
app.get("/users/:id", getOneUser);
app.post("/user/:id", authMiddleware, updateUserInformation);
app.post("/signup", registerUser);
app.post("/login", loginUser);

// app.get('/users', getAllUsers)
app.post("/resetpassword", forgottenPassword);
// app.get('/users/:id', getOneUser)

// Configures firebase and lets it know that the app container is serving the functionalities
exports.api = functions.region("europe-west2").https.onRequest(app);
