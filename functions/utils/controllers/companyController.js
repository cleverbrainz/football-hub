const { report } = require('process')
const { db, admin } = require('../admin')
const config = require('../configuration')

exports.getAllCompanies = (req, res) => {
  db.collection('users')
    .where('category', '==', 'company')
    // If data needs to be ordered, use .orderBy(field, desc/asc)
    .get()
    .then((data) => {
      const companies = []
      // Where doc = QueryDocumentSnapshot, data() returns the object data
      data.forEach((doc) => {
        // console.log(doc.id)
        companies.push({
          companyId: doc.id,
          companyInfo: { ...doc.data() },
        })
      })
      return res.status(200).json(companies)
    })
    .catch((err) => console.error(err))
}
exports.updateUserInformation = (req, res) => {
  db.doc(`/users/${req.user}`)
    .update({ ...req.body })
    .then(() =>
      res.status(201).json({ message: 'Information successfully updated' })
    )
}

exports.postNewCompany = (req, res) => {
  const { name, started, players } = req.body
  const newCompany = { name, started, players }

  db.collection('companies')
    // Can create own object as above or use req.body from the request
    .add(newCompany)
    .then((data) => {
      res
        .status(201)
        .json({ message: `${data.id} company successfully added` })
    })
    .catch((err) => {
      res
        .status(500)
        .json({ error: 'Something went wrong, company could not be added' })
      console.error(err)
    })
}

exports.addAgeDetail = (req, res) => {
  console.log(req.body)
  db.doc(`users/${req.user}`)
    .update({ ...req.body })
    .then(() => {
      res.status(201).json({ message: 'Age information updated successfully' })
    })
    .catch((err) => {
      console.log(err)
    })
}

exports.addNewDetail = (req, res) => {
  const requestObject = { ...req.body }
  console.log(req.params.detail)

  db.collection(req.params.detail)
    .add(req.body)
    .then((data) => {
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

      return (
        db
          // .doc(`coaches/${data.id}`)
          .doc(`${req.params.detail}/${data.id}`)
          .update({ [detailId]: data.id })
      )
    })
    .then(() => {
      db.doc(`users/${req.body.companyId}`)
        .get()
        .then((data) => {
          let newArr = []
          if (data.data()[req.params.detail]) {
            newArr = [...data.data()[req.params.detail], requestObject]
          } else newArr = [requestObject]

          db.doc(`users/${req.body.companyId}`).update({
            [req.params.detail]: newArr,
          })
        })
        .then(() => {
          res.status(201).json({ message: 'new message added successfully' })
        })
        .catch((err) => {
          res.status(500).json({
            error: 'Something went wrong, enquiry could not be added',
          })
          console.error(err)
        })
    })
}

exports.editCompanyDetail = (req, res) => {
  console.log(req.body, req.params.detail)

  const { detail } = req.params
  const detailId = req.body.coachId ? req.body.coachId : req.body.serviceId

  db.doc(`${detail}/${detailId}`)
    .update(req.body)
    .then(() => {
      db.doc(`users/${req.user}`)
        .get()
        .then((data) => {
          const nonChangingArr = data.data()[detail].filter((el) => {
            return (
              el[detail === 'coaches' ? 'coachId' : 'serviceId'] !== detailId
            )
          })

          db.doc(`users/${req.user}`).update({
            [detail]: [...nonChangingArr, req.body],
          })
        })
    })
    .then(() => {
      res.status(201).json({ message: 'information updated successfully' })
    })
    .catch((err) => {
      console.log(err)
      res.status(500).json({
        error: 'Something went wrong, information could not be updated',
      })
    })
}

exports.dataDeletion = (req, res) => {
  const { id, detail } = req.params
  db.collection(detail)
    .doc(id)
    .delete()
    .then(() => {
      db.doc(`users/${req.user}`)
        .get()
        .then((data) => {
          const nonChangingArr = data.data()[detail].filter((el) => {
            return el[detail === 'coaches' ? 'coachId' : 'serviceId'] !== id
          })
          return db
            .doc(`/users/${req.user}`)
            .update({ [detail]: nonChangingArr })
            .then(() => {
              res
                .status(201)
                .json({ message: 'information deleted successfully' })
            })
            .catch((err) => {
              console.log(err)
              res.status(500).json({
                error: 'Something went wrong, information could not be deleted',
              })
            })
        })
    })
}

exports.uploadCoachDocument = (req, res) => {
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
    console.log('hello')
    admin
      .storage()
      .bucket()
      .upload(documentToBeUploaded.filePath, {
        resumable: false,
        metadata: {
          metadata: {
            contentType: documentToBeUploaded.mimetype,
          },
        },
      })
      .then(() => {
        const documentURL = `https://firebasestorage.googleapis.com/v0/b/${config.storageBucket}/o/${documentFileName}?alt=media`

        db.doc(`users/${req.user}`)
          .get()
          .then((data) => {
            const nonChangingArr = []
            let changingObj

            data.data().coaches.map((el) => {
              if (el.coachId !== req.params.id) {
                nonChangingArr.push(el)
              } else changingObj = el
            })

            const updatedObj = {
              ...changingObj, documents:
                changingObj.documents ? [...changingObj.documents, documentURL]
                  : [documentURL]
            }

            db.doc(`coaches/${req.params.id}`)
              .update(updatedObj)
              .then(() => {
                db.doc(`users/${req.user}`)
                  .update({
                    coaches: [...nonChangingArr, updatedObj],
                  })
                  .then(() => {
                    res
                      .status(201)
                      .json({ message: 'information updated successfully' })
                  })
                  .catch((err) => {
                    console.log(err)
                  })
              })
          })
      })
  })

  busboy.end(req.rawBody)
}

exports.editCompanyLocation = (req, res) => {
  console.log(req.body)
  db.doc(`users/${req.user}`)
    .update({ location: req.body })
    .then(() => {
      res.status(201).json({ message: 'information updated successfully' })
    })
    .catch((err) => {
      console.log(err)
    })
}

exports.coachImageUpload = (req, res) => {
  console.log('hellooooo')
  console.log('hellooooo')
  console.log('hellooooo')

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
        const imageURL = `https://firebasestorage.googleapis.com/v0/b/${config.storageBucket}/o/${imageFileName}?alt=media`

        db.doc(`users/${req.user}`)
          .get()
          .then((data) => {
            const nonChangingArr = []
            let changingObj

            data.data().coaches.map((el) => {
              if (el.coachId !== req.params.id) {
                nonChangingArr.push(el)
              } else changingObj = el
            })

            const updatedObj = { ...changingObj, imageURL }

            db.doc(`coaches/${req.params.id}`)
              .update(updatedObj)
              .then(() => {
                db.doc(`users/${req.user}`)
                  .update({
                    coaches: [...nonChangingArr, updatedObj]
                  })
                  .then(() => {
                    res
                      .status(201)
                      .json({ message: imageURL })
                  })
                  .catch((err) => {
                    console.log(err)
                  })
              })
          })
      })
  })
  busboy.end(req.rawBody)
}

// exports.uploadCompanyDocument = (req, res) => { }
