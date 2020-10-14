const { db, admin } = require('../admin')
const config = require('../configuration')


exports.getAllCompanies = (req, res) => {
  db
    .collection('users')
    .where('category', '==', 'company')
    // If data needs to be ordered, use .orderBy(field, desc/asc)
    .get()
    .then(data => {
      const companies = []
      // Where doc = QueryDocumentSnapshot, data() returns the object data
      data.forEach(doc => {
        // console.log(doc.id)
        companies.push({
          companyId: doc.id,
          companyInfo: { ...doc.data() }
        })
      })
      return res.status(200).json(companies)
    })
    .catch(err => console.error(err))
}

exports.postNewCompany = (req, res) => {

  const { name, started, players } = req.body
  const newCompany = { name, started, players }

  db
    .collection('companies')
    // Can create own object as above or use req.body from the request
    .add(newCompany)
    .then(data => {
      res
        .status(201)
        .json({ message: `${data.id} company successfully added` })
    })
    .catch(err => {
      res
        .status(500)
        .json({ error: 'Something went wrong, company could not be added' })
      console.error(err)
    })
}


exports.addNewDetail = (req, res) => {

  const requestObject = { ...req.body }
  console.log(req.params.detail)

  db
    .collection(req.params.detail)
    .add(req.body)
    .then(data => {
      let detailId

      switch (req.params.detail) {
        case 'coaches':
          detailId = 'coachId'
          break
        case 'services':
          detailId = 'serviceId'
          break
        case 'courses':
          detailId = 'courseId'
          break
        default:
          break
      }

      requestObject[detailId] = data.id

      if (detailId === 'coachId') {
        const noImg = 'no-img.jpeg'
        requestObject.imageURL = `https://firebasestorage.googleapis.com/v0/b/${config.storageBucket}/o/${noImg}?alt=media`
      }

      return db
        // .doc(`coaches/${data.id}`)
        .doc(`${req.params.detail}/${data.id}`)
        .update({ [detailId]: data.id })
    })
    .then(() => {
      db
        .doc(`users/${req.body.companyId}`)
        .get()
        .then(data => {
          let newArr = []
          if (data.data()[req.params.detail]) {
            newArr = [...data.data()[req.params.detail], requestObject]
          } else newArr = [requestObject]

          db
            .doc(`users/${req.body.companyId}`)
            .update({ [req.params.detail]: newArr })
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
    })
}

exports.editCompanyDetail = (req, res) => {
  console.log(req.body, req.params.detail)

  const { detail } = req.params
  const detailId = req.body.coachId ? req.body.coachId : req.body.serviceId

  db
    .doc(`${detail}/${detailId}`)
    .update(req.body)
    .then(() => {
      db
        .doc(`users/${req.user}`)
        .get()
        .then(data => {
          const nonChangingArr = data.data()[detail].filter(el => {
            return el[detail === 'coaches' ? 'coachId' : 'serviceId'] !== detailId
          })

          db
            .doc(`users/${req.user}`)
            .update({ [detail]: [...nonChangingArr, req.body] })
        })
    })
    .then(() => {
      res
        .status(201)
        .json({ message: 'information updated successfully' })
    })
    .catch(err => {
      console.log(err)
      res
        .status(500)
        .json({ error: 'Something went wrong, information could not be updated' })
    })
}

