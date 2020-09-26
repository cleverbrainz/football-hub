const { db, admin } = require('../admin')
const { validateSignupFields, validateLoginFields } = require('../validators')
const config = require('../configuration')
const nodemailer = require('nodemailer')

const firebase = require('firebase')
firebase.initializeApp(config)


exports.registerUser = (req, res) => {

  // future consideration of category input when signing up new user
  const { fullName, email, password } = req.body
  const newUser = { fullName, email }
  const { valid, error } = validateSignupFields(req.body)

  if (!valid) return res.status(400).json(error)

  const noImg = 'no-img.jpeg'
  newUser.imageURL = `https://firebasestorage.googleapis.com/v0/b/${config.storageBucket}/o/${noImg}?alt=media`

  firebase
    .auth()
    .createUserWithEmailAndPassword(email, password)
    .then(data => {
      newUser.userId = data.user.uid
      data.user.getIdToken()
    })
    .then(() => {
      db
        .collection('users')
        .doc(`${newUser.userId}`)
        .set(newUser)
    })
    .then(() => {

      const user = firebase.auth().currentUser

      user
        .sendEmailVerification()
        .then(() => {
          res
            .status(201)
            .json({ message: 'We\'ve sent you an email with instructions to verfiy your email address. Please make sure it didn\'t wind up in your Junk Mail.' })
        })
        .catch(error => {
          console.err(error)
        })

      // const output = `
      // <h2 style='text-align:center'> The Ballers Hub </h2>
      // <h4> Please verify your email </h4>
      // <p> Hello! </p>
      // <p> Thank you for registering to The Ballers Hub. </p>
      // <p> It looks like you need to verify your email address to activate your account.
      // Please click the link below to complete the verification process. </p>
      // <a href='google.com'> Click here to verify email address now </a> 
      // <p> Thanks, <span style='display:block;'> The Ballers Hub </span> </p>
      // `
      // const transporter = nodemailer.createTransport({
      //   host: 'secure.emailsrvr.com',
      //   port: 465,
      //   secure: true,
      //   auth: {
      //     user: 'kenn@indulgefootball.com',
      //     pass: 'liverpool1a*'
      //   },
      //   tls: {
      //     rejectUnauthorized: false
      //   }
      // })

      // const mailOptions = {
      //   from: ' "Kenn" <kenn@indulgefootball.com>',
      //   to: email,
      //   subject: 'Please verify your email',
      //   text: 'Hello world?',
      //   html: output
      // }

      // transporter.sendMail(mailOptions, (err, info) => {
      //   if (err) {
      //     return console.log(err)
      //   }

      //   console.log('Message sent: %s', info.messageId)
      //   console.log('Preview URL: %s', nodemailer.getTestMessageUrl(info))
      // })
    })
    .catch(err => {
      if (err.code === 'auth/email-already-in-use') {
        res.status(400).json({ error: 'This email is already in use' })
      }
    })
}



exports.loginUser = (req, res) => {
  const { email, password } = req.body
  const { valid } = validateLoginFields(req.body)

  if (!valid) return res.status(400).json({ message: 'Invalid credentials' })

  firebase
    .auth()
    .signInWithEmailAndPassword(email, password)
    .then(data => data.user.getIdToken())
    .then(token => res.json({ token }))
    .catch(err => {
      return res.status(403).json({ message: 'Invalid credentials' })
    })
}



exports.userImageUpload = (req, res) => {
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
    imageFileName = `${Math.round(Math.random() * 10000000000)}.${imageExtension}`
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
        // Once image is uploaded, we add it to the user within the promise
        const imageURL = `https://firebasestorage.googleapis.com/v0/b/${config.storageBucket}/o/${imageFileName}?alt=media`

        return db
          .doc(`/users/${req.user}`)
          .update({ imageURL })
      })
      .then(() => {
        res.status(201).json({ message: 'Image successfully uploaded' })
      })
      .catch(err => {
        console.error(err)
        return res.status(500).json({ error: 'helloooo' })
      })
  })
  busboy.end(req.rawBody)
}


exports.getOneUser = (req, res) => {
  db
    .collection('users')
    .where('userId', '==', req.params.id)
    .get()
    .then(data => {
      const user = []
      data.forEach(doc => {
        user.push(doc.data())
      })
      return res.json(user)
    })
    .catch(err => console.error(err))
}


exports.forgottenPassword = (req, res) => {
  const { email } = req.body
  const emailRegEx = /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/

  if (!emailRegEx.test(email)) return res.status(400).json({ message: 'Must be a valid email address' })

  console.log(email)

  firebase
    .auth()
    .sendPasswordResetEmail(email)
    .then(() => {
      return res.status(200).json({ message: 'We\'ve sent you an email with instructions to reset your password. Please make sure it didn\'t wind up in your Junk Mail.' })
    })
    .catch(err => {
      return res.status(400).json({ err: err })
    })
}



// 


exports.userDocumentUpload = (req, res) => {
  // HTML form data parser for Nodejs
  const BusBoy = require('busboy')
  const path = require('path')
  const os = require('os')
  const fs = require('fs')
  const busboy = new BusBoy({ headers: req.headers })

  let documentFileName
  let documentToBeUploaded = {}

  busboy.on('file', (fieldname, file, filename, encoding, mimetype) => {

    // Grabbing the file extension
    const fileSplit = filename.split('.')
    const documentExtension = fileSplit[fileSplit.length - 1]

    // Generating new file name with random numbers 
    documentFileName = `${Math.round(Math.random() * 10000000000)}.${documentExtension}`
    // Creating a filepath for the image and storing it in a temporary directory
    const filePath = path.join(os.tmpdir(), documentFileName)
    documentToBeUploaded = { filePath, mimetype }

    // Using file system library to create the file
    file.pipe(fs.createWriteStream(filePath))
  })

  // Function to upload image file on finish 
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
        // Once image is uploaded, we add it to the user within the promise
        const documentURL = `https://firebasestorage.googleapis.com/v0/b/${config.storageBucket}/o/${documentFileName}?alt=media`

        return db
          .doc(`/users/${req.user}`)
          .update({ documentURL })
      })
      .then(() => {
        res.status(201).json({ message: 'Document successfully uploaded' })
      })
      .catch(err => {
        console.error(err)
        return res.status(500).json({ error: 'Error uploading document' })
      })
  })
  busboy.end(req.rawBody)
}
