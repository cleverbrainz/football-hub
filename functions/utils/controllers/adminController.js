const { db, admin } = require('../admin')
// const config = require('../configuration')

exports.adminPageEdits = (req, res) => {
  console.log(req.body)
  db
    .doc(`admin/${req.params.id}`)
    .update(req.body)
    .then(() => res.status(201).json({ message: 'page successfully updated' }))
    .catch(err => console.error(err))
}

exports.getAdminPageDetails = (req, res) => {
  console.log(req.body)
  db
    .doc(`admin/${req.params.id}`)
    .get()
    .then(data => res.status(201).json(data))
    .catch(err => console.error(err))
}

exports.createAwaitingVerification = (req, res) => {
  db.collection('awaitingVerification').add({
    userId: req.info.userId,
    name: req.info.name,
    documents: req.info.documents,
    verification: req.info.verification,
    message: ''
  })
    .then(data => {
      db.doc(`awaitingVerification/${data.id}`).update({
        verificationId: data.id
      })
      db.doc(`users/${req.user}`).update({
        verificationId: data.id
      })
      res.status(201).json({ message: 'Document successfully uploaded', data })
    })
    .catch(error => console.log(error))
}

exports.getVerifications = (req, res) => {
  console.log('hello')
  const data = []
  db.collection('awaitingVerification').get()
    .then(info => {
      console.log('info!')
      info.forEach(item => {
        console.log
        data.push([item.id, item.data()])
      })
      console.log(data)
      return res.status(201).json(data)
    })
    .catch(err => console.log(err))
}

exports.acceptAwaitingVerification = (req, res) => {
  console.log(req.body)
  db.collection('awaitingVerification').doc(`${req.body.verificationId}`).delete()
    .then(() =>{
      db.doc(`users/${req.body.userId}`).update({
        verification: req.body.accepted,
        message: req.body.message,
        verificationId: ''
      })
      return res.status(201).json({ message: 'Documents successfully verified!' })
    })
}