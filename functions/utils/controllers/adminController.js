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
    .then(data => res.status(201).json(data.data()))
    .catch(err => console.error(err))
}