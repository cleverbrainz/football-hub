const { db, admin } = require('../admin')

exports.getAllCompanies = (req, res) => {
  db
    .collection('companies')
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

