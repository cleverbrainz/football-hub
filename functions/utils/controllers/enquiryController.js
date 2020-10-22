const { db, admin } = require('../admin')
// const config = require('../configuration')
const firebase = require('firebase')
const nodemailer = require("nodemailer");
const nodeoutlook = require('nodejs-nodemailer-outlook')

exports.newEnquiry = (req, res) => {
  const { name, email, companyId, message, subject, userId, company } = req.body
  const newEnquiry = {
    subject,
    email,
    companyId,
    name,
    userId,
    company,
    messages: []
  }

  const messageBody = {
    from: userId,
    message,
    createdAt: admin.firestore.Timestamp.fromDate(new Date())
  }

  db
    .collection('enquiries')
    .add(newEnquiry)
    .then(data => {
      db
        .collection('enquiries')
        .doc(data.id)
        .update({ messages: [{ ...messageBody }] })
    })
    .then(() => {
      res
        .status(201)
        .json({ message: 'new message added successfully' })
    })
    .catch(err => {
      res
        .status(500)
        .json({ error: 'Something went wrong, enquiry could not be added' })
      console.error(err)
    })
}

exports.getEnquiries = (req, res) => {
  console.log(req.params.category)
  const fieldName = req.params.category === 'player' ? 'userId' : 'companyId'
  db
    .collection('enquiries')
    .where(fieldName, '==', req.user)
    .get()
    .then(async data => {

      const enquiries = []

      await data.forEach(el => {
        enquiries.push({
          enquiryId: el.id,
          enquiryInfo: { ...el.data() }
        })
      })
      return res.status(200).json(enquiries)
    })
    .catch(err => console.error(err))
}


exports.updateOneEnquiry = (req, res) => {

  const messageBody = {
    ...req.body,
    createdAt: admin.firestore.Timestamp.fromDate(new Date())
  }

  db
    .doc(`enquiries/${req.params.id}`)
    .get()
    .then(data => {
      const newMessagesArr = [...data.data().messages, messageBody]

      db
        .doc(`enquiries/${req.params.id}`)
        .update({ messages: newMessagesArr })
    })
    .then(() => res.status(201).json({ message: 'Message successfully sent' }))
    .catch(err => console.error(err))

}


exports.preRegistrationEnquiry = (req, res) => {

  const { name, email, message } = req.body
  console.log(req.body)

  const output = `
    <h2 style='text-align:center'> The Ballers Hub General Enquiry </h2>
    <p> Hello, </p>
    <p> ${name} has sent a new general enquiry. Please see below. </p>
    <p> Email: ${email} </p>
    <p> Message: <span style='display:block;'> ${message} </span> </p>
  `

  const transporter = nodemailer.createTransport({
    host: 'smtp.office365.com',
    port: 587,     
    auth: {
      user: 'kenn@indulgefootball.com',
      pass: 'Welcome342!'
    },
    secureConnection: false,
    tls: {
      ciphers: 'SSLv3'
    }
  })


  const mailOptions = {
    from: email,
    to: ' "Kenn" <kennkenns@hotmail.com>',
    subject: 'New Ballers Hub General Enquiry',
    text: 'Hello world?',
    html: output
  }

  transporter.sendMail(mailOptions, (err, info) => {
    if (err) {
      return console.log(err)
    }

    console.log('Message sent: %s', info.messageId)
    console.log('Preview URL: %s', nodemailer.getTestMessageUrl(info))
  })


}