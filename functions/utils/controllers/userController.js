const { db, admin } = require('../admin')
const { validateSignupFields, validateLoginFields } = require('../validators')
const config = require('../configuration')
const nodemailer = require('nodemailer')

const firebase = require('firebase')
const { createAwaitingVerification } = require('./adminController')
firebase.initializeApp(config)

exports.registerUser = (req, res) => {
  const { name, email, password } = req.body
  const newUser = { name, email }
  const { valid, error } = validateSignupFields(req.body)


  if (!valid) return res.status(400).json(error)
  
    firebase
      .auth()
      .createUserWithEmailAndPassword(email, password)
      .then((data) => {
        newUser.userId = data.user.uid
        newUser.joined = admin.firestore.Timestamp.fromDate(new Date())
        newUser.account_validation_check = false
        data.user.getIdToken()
        return data.user
      })
      .then(user => {
        user
          .sendEmailVerification()
      })
      .then(() => {
        db.collection('users').doc(`${newUser.userId}`).set(newUser)
      })
      .then(() => {
        res.status(201).json({
          message:
            'We\'ve sent you an email with instructions to verfiy your email address. Please make sure it didn\'t wind up in your Junk Mail.',
          userId: newUser.userId
        })
      })
    .catch((err) => {
      if (err.code === 'auth/email-already-in-use') {
        res.status(400).json({ error: 'This email is already in use' })
      }
    })
}

exports.initialRegistrationUserInformation = (req, res) => {
  // const user = firebase.auth().currentUser

  const newUser = { ...req.body }

  if (newUser.category === 'player' || newUser.category === 'parent') {
    const noImg = 'no-img.jpeg'
    newUser.bio = ''
    newUser.imageURL = `https://firebasestorage.googleapis.com/v0/b/${config.storageBucket}/o/${noImg}?alt=media`
  } else {
    if (newUser.category === 'coach') {
      newUser.verification = {
        coachDocumentationCheck: false,
        paymentCheck: false
      }
      newUser.companies = []
      newUser.coachInfo = {}
    } else {
      newUser.verification = {
        coachDocumentationCheck: false,
        companyDetailsCheck: false,
        paymentCheck: false
      }
      newUser.coaches = []
      newUser.bio = ''
    }
  }

  console.log('newuser', newUser)

  newUser.requests = []
  newUser.sentRequests = []

  // createAwaitingVerification({ ...newUser, type: 'companyInfo' })
  //   .then(data => {
  //     console.log('back to user', data)
  //     db.doc(`/users/${req.body.userId}`).update({ ...newUser, verificationId: data.id })
  //   })
  db.doc(`/users/${req.body.userId}`).update({ ...newUser })
    .then(() =>
      res.status(201).json({ message: 'Information successfully updated' })
    )
    .catch(err => console.log(err))
}

// exports.updateCompanyListingInformation = (req, res) => {
//   const { bio, reasons_to_join } = req.body;

//   db.doc(`/users/${req.user}`)
//     .update({ bio, reasons_to_join })
//     .then(() =>
//       res.status(201).json({ message: 'Information successfully updated' })
//     );
// };



exports.getCompaniesAndCoaches = (req, res) => {
  console.log('HELLOOO')
  db.collection('users')
    .get()
    .then((data) => {
      const companies = [],
        coaches = []

      data.forEach((doc) => {
        const { category } = doc.data()
        if (category === 'company') companies.push(doc.data())
        if (category === 'coach') coaches.push(doc.data())

      })

      return res.status(201).json({ coaches, companies })
    })
    .catch((err) => console.error(err))
}





exports.loginUser = (req, res) => {
  const { email, password } = req.body
  const { valid } = validateLoginFields(req.body)
  let userId

  if (!valid) return res.status(400).json({ message: 'Invalid credentials' })
  
    firebase
      .auth()
      .signInWithEmailAndPassword(email, password)
      .then((data) => {

        userId = data.user.uid
        return data.user.getIdToken()
      })
      .then((token) => {
        db.doc(`/users/${userId}`)
          .get()
          .then((data) => {

            // console.log(data.data())
            // await data.forEach((doc) => user.push(doc.data()))
            // return {
            //   token,
            //   accountCategory: user[0].category
            // }
            // return {
            //   token,
            //   accountCategory: data.data()[0].category
            // }
            let response
            let status
            if (data.data().category) {
              response = {
                token,
                accountCategory: data.data().category
              }
              status = 201
            } else {
              response = { message: 'Invalid credentials' },
              status = 403 
            }
            return { response, status }
          })
          .then((data) => res.status(data.status).send(data.response))
      })
    .catch((err) => {
      return res.status(403).json({ message: 'Invalid credentials', error: err })
    })
}



exports.imageDeletion = (req, res) => {
  db.collection('users')
    .where('userId', '==', req.user)
    .get()
    .then((data) => {
      const user = []
      data.forEach((doc) => user.push(doc.data()))

      if (user[0].category === 'company') {
        const newImageArr = user[0].images.filter(
          (el, i) => i !== parseInt(req.params.id)
        )

        return db.doc(`/users/${req.user}`).update({ images: newImageArr })
      }
    })
    .then(() => {
      res.status(201).json({ message: 'Image successfully deleted' })
    })
    .catch((err) => res.status(400).json({ err: err }))
}

exports.customerImageUpload = (req, res) => {
  console.log(req.body)

  // HTML form data parser for Nodejs
  const BusBoy = require('busboy')
  const path = require('path')
  const os = require('os')
  const fs = require('fs')
  const busboy = new BusBoy({ headers: req.headers })

  let imageFileName
  let imageToBeUploaded = {}

  busboy.on('file', (fieldname, file, filename, encoding, mimetype) => {
    // Grabbing the file extension
    const fileSplit = filename.split('.')
    const imageExtension = fileSplit[fileSplit.length - 1]

    // Generating new file name with random numbers
    imageFileName = `${Math.round(
      Math.random() * 10000000000
    )}.${imageExtension}`
    // Creating a filepath for the image and storing it in a temporary directory
    const filePath = path.join(os.tmpdir(), imageFileName)
    imageToBeUploaded = { filePath, mimetype }

    // Using file system library to create the file
    file.pipe(fs.createWriteStream(filePath))
  })
  // Function to upload image file on finish
  busboy.on('finish', () => {
    admin
      .storage()
      .bucket()
      .upload(imageToBeUploaded.filePath, {
        resumable: false,
        metadata: {
          metadata: {
            contentType: imageToBeUploaded.mimetype
          }
        }
      })
      .then(() => {
        db.collection('users')
          .where('userId', '==', req.user)
          .get()
          .then((data) => {
            // Once image is uploaded, we add it to the user within the promise
            const imageURL = `https://firebasestorage.googleapis.com/v0/b/${config.storageBucket}/o/${imageFileName}?alt=media`
            const user = []
            data.forEach((doc) => user.push(doc.data()))

            if (user[0].category === 'company') {
              const newImageArr = [...user[0].images, imageURL]
              return db
                .doc(`/users/${req.user}`)
                .update({ images: newImageArr })
            } else {
              return db.doc(`/users/${req.user}`).update({ imageURL })
            }
          })
          .then(() => {
            res.status(201).json({ message: 'Image successfully uploaded' })
          })
      })
      .catch((err) => {
        console.error(err)
        return res.status(500).json({ error: 'helloooo' })
      })
  })
  busboy.end(req.rawBody)
}

exports.getOneUser = (req, res) => {
  console.log(req.params.id)
  db.collection('users')
    .where('userId', '==', req.params.id)
    .get()
    .then((data) => {
      const user = []
      data.forEach((doc) => {
        user.push(doc.data())
      })
      return res.json(user)
    })
    .catch((err) => console.error(err))
}

exports.forgottenPassword = (req, res) => {
  const { email } = req.body
  const emailRegEx = /^(([^<>()[\]\\.,;:\s@']+(\.[^<>()[\]\\.,;:\s@']+)*)|('.+'))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/

  if (!emailRegEx.test(email))
    return res.status(400).json({ message: 'Must be a valid email address' })

  console.log(email)

  firebase
    .auth()
    .sendPasswordResetEmail(email)
    .then(() => {
      return res.status(200).json({
        message:
          'We\'ve sent you an email with instructions to reset your password. Please make sure it didn\'t wind up in your Junk Mail.'
      })
    })
    .catch((err) => {
      return res.status(400).json({ err: err })
    })
}

//

exports.userDocumentUpload = (req, res) => {
  const BusBoy = require('busboy')
  const path = require('path')
  const os = require('os')
  const fs = require('fs')
  const busboy = new BusBoy({ headers: req.headers })

  let documentFileName
  let documentToBeUploaded = {}

  busboy.on('file', (fieldname, file, filename, encoding, mimetype) => {
    const fileSplit = filename.split('.')
    const documentExtension = fileSplit[fileSplit.length - 1]

    documentFileName = `${Math.round(
      Math.random() * 10000000000
    )}.${documentExtension}`

    const filePath = path.join(os.tmpdir(), documentFileName)
    documentToBeUploaded = { filePath, mimetype }

    file.pipe(fs.createWriteStream(filePath))
  })

  busboy.on('finish', () => {
    admin
      .storage()
      .bucket()
      .upload(documentToBeUploaded.filePath, {
        resumable: false,
        metadata: {
          metadata: {
            contentType: documentToBeUploaded.mimetype
          }
        }
      })
      .then(() => {
        const documentURL = `https://firebasestorage.googleapis.com/v0/b/${config.storageBucket}/o/${documentFileName}?alt=media`

        return db.doc(`/users/${req.user}`).update({ documentURL })
      })
      .then((data) => {
        console.log(data)
        const { verification, userId, coachInfo } = data.transformResults[0]
        if (coachInfo.documentation.dbsCertificate && coachInfo.documentation.coachingCertificate) {
          const verificationData = {
            userId,
            name: coachInfo.name,
            documentation: coachInfo.documentation,
            verification,
            type: 'coachDocument'
          }
          createAwaitingVerification(verificationData)
            .then(data => {
              return db.doc(`/users/${req.user}`).update({ verificationId: data.id })
            })
        }
        res.status(201).json({ message: 'Document successfully uploaded' })
      })
      .catch((err) => {
        console.error(err)
        return res.status(500).json({ error: 'Error uploading document' })
      })
  })
  busboy.end(req.rawBody)
}


exports.updateUserDetails = (req, res) => {
  const userref = db.doc(`users/${req.body.userId}`)

  return userref.update(req.body.updates)
    .then(() => {
      res.status(201).send({ message: 'user successfully updated' })
    })
    .catch(error => console.log(error))
}

exports.searchForPlayers = (req, res) => {

  const { query } = req.params
  const coachArray = []
  const userRef = db.collection('users').where('category', '==', 'player')

  return userRef.orderBy('name').startAt(query.toUpperCase()).endAt(`${query.toLowerCase()}\uf8ff`).get()
    .then(list => {
      list.forEach(item => {
        coachArray.push(item.data())
      })
      res.status(201).json(coachArray)
    })
    .catch(err => console.log(err))
}