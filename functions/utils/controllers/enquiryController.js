const { db, admin } = require('../admin')
// const config = require('../configuration')
const firebase = require('firebase')
// firebase.initializeApp(config)

exports.newEnquiry = (req, res) => {
  const { name, email, company, message, subject, userId } = req.body
  const newEnquiry = {
    subject,
    email,
    company,
    name,
    userId,
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

exports.getEnquiry = (req, res) => {

  db
    .collectionGroup('enquiries')
    .where('userId', '==', req.user)
    .get()
    .then(data => {

      const enquiries = []

      data.forEach(el => {
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