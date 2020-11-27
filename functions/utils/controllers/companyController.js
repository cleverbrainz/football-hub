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
  db.collection('listings')
    .get()
    .then((data) => {
      const listings = []
      // Where doc = QueryDocumentSnapshot, data() returns the object data
      data.forEach((doc) => {
        // console.log(doc.id)
        listings.push({
          companyId: doc.id,
          companyInfo: { ...doc.data() }
        })
      })
      return res.status(200).json(listings)
    })
    .catch((err) => console.error(err))
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
  console.log(req.body[0])
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

  const getDaysArray = function (start, end) {
    for (var arr = [], dt = new Date(start); dt <= end; dt.setDate(dt.getDate() + 1)) {
      arr.push(new Date(dt))
    }
    return arr
  }

  const requestObject = { ...req.body }

  if (req.params.detail === 'courses') {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
    const { sessions, startTime, endTime, spaces } = requestObject.courseDetails
    const { courseType, firstDay, lastDay, excludeDays } = req.body.courseDetails
    if (courseType === 'Camp') {
      getDaysArray(new Date(firstDay), new Date(lastDay)).map(el => {
        if (!excludeDays.includes(days[el.getDay()])) {
          sessions.push({
            sessionDate: el,
            startTime,
            endTime,
            spaces
          })
        }
      })
    }
  } 

  console.log(requestObject)

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
        case 'locations':
          detailId = 'locationId'
          break
        case 'listings':
          detailId = 'listingId'
          break
        default:
          break
      }

      requestObject[detailId] = data.id

      if (detailId === 'coachId') {
        const noImg = 'no-img.jpeg'
        requestObject.imageURL = `https://firebasestorage.googleapis.com/v0/b/${config.storageBucket}/o/${noImg}?alt=media`
      } 

      console.log('stepppp1')

      return (
        db
          // .doc(`coaches/${data.id}`)
          .doc(`${req.params.detail}/${data.id}`)
          .update({ [detailId]: data.id })
      )
    })
    .then(() => {
      console.log('stepppp2')
      db.doc(`users/${req.body.companyId}`)
        .get()
        .then((data) => {
          let newArr = []
          if (data.data()[req.params.detail]) {
            newArr = [...data.data()[req.params.detail], requestObject]
          } else newArr = [requestObject]

          db.doc(`users/${req.body.companyId}`).update({
            [req.params.detail]: newArr
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
    case 'locations':
      detailId = 'locationId'
      break
    case 'listings':
      detailId = 'listingId'
      break
    default:
      break
  }

  db.doc(`${detail}/${req.body[detailId]}`)
    .update(req.body)
    .then(() => {
      db.doc(`users/${req.user}`)
        .get()
        .then((data) => {
          const nonChangingArr = data.data()[detail].filter((el) => {
            return el[detailId] !== req.body[detailId]
          })

          db.doc(`users/${req.user}`).update({
            [detail]: [...nonChangingArr, req.body]
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

            if (detail === "coaches") {
              return el.coachId !== id
            } else if (detail === "services") {
              return el.serviceId !== id
            } else if (detail === 'locations') {
              return el.locationId !== id
            } else return el.courseId !== id

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
                error: 'Something went wrong, information could not be deleted'
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

// exports.editCompanyLocation = (req, res) => {
//   console.log(req.body)
//   db.doc(`users/${req.user}`)
//     .update({ location: req.body })
//     .then(() => {
//       res.status(201).json({ message: 'information updated successfully' })
//     })
//     .catch((err) => {
//       console.log(err)
//     })
// }

exports.coachImageUpload = (req, res) => {

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



exports.filterListings = (req, res) => {

  const deg2rad = (deg) => {
    return deg * (Math.PI / 180)
  }

  const getDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371 // Radius of the earth in km
    const dLat = deg2rad(lat2 - lat1)  // deg2rad below
    const dLon = deg2rad(lon2 - lon1)
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2)
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
    const d = R * c // Distance in km
    return d.toFixed()
  }

  function cleanObject(obj) {
    for (var propName in obj) {
      if (!obj[propName]) delete obj[propName]
      else if (typeof obj[propName] === 'object') cleanObject(obj[propName])
    }
    return obj
  }

  const filteredObject = cleanObject(req.body)

  db
    // .collection('users')
    // .where('category', '==', 'company')
    .collection('listings')
    .get()
    .then((data) => {
      const listings = []
      data.forEach((doc) => {
        listings.push({
          companyId: doc.id,
          listingInfo: { ...doc.data() }
        })
      })

      const filteredListings = []
      // fitler specifications
      const { timing, location, age } = filteredObject
      const days = Object.keys(timing.days).length === 0
      const times = Object.keys(timing.times).length === 0
      const ages = Object.keys(age).length === 0

      console.log(filteredObject)

      listings.map(listing => {

        for (let i = 0; i < listing.listingInfo.courses.length; i++) {

          const { courseDetails } = listing.listingInfo.courses[i]
          const { sessions,
            courseType,
            longitude,
            latitude } = courseDetails
          const obj = {}

          if (location.longitude) {
            const dis = getDistance(location.latitude, location.longitude, latitude, longitude)
            if (parseInt(dis) < 10) {
              obj.location = true
            } else {
              obj.location = false
            }
          }

          if (!days) {
            if (courseType.toLowerCase() === 'weekly') {
              for (let j = 0; j < sessions.length; j++) {
                if (timing.days[sessions[j].day.toLowerCase()]) {
                  obj.days = true
                } else {
                  obj.days = false
                }
              }

            }
          }

          if (!times) {
            if (courseType.toLowerCase() === 'weekly') {

              for (let j = 0; j < sessions.length; j++) {
                const { startTime } = sessions[j]
                const time = parseInt(startTime.charAt(0))

                // morning filteration
                if (timing.times['morning']) {
                  if (startTime.includes('am')) {
                    obj.times = true
                    // break
                  } else obj.times = false
                }
                // afternoon filteration
                if (timing.times['afternoon']) {
                  if (startTime.includes('pm') && (time === 12 || (time >= 1 && time < 6))) {
                    obj.times = true
                    // break
                  } else obj.times = false
                }
                // evening filteration
                if (timing.times['evening']) {
                  if (startTime.includes('pm') && (time >= 6 && time < 10)) {
                    obj.times = true
                    // break
                  } else obj.times = false
                }
              }
            }
          }

          // age filteration
          if (!ages) {
            const ageRange = []

            if (courseDetails.age === 'Adults') ageRange.push('adults')

            else {
              const startAge = courseDetails.age.split('-')[0]
              const endAge = courseDetails.age.split('-')[1]

              if (endAge === 'Adults') {
                for (var j = parseInt(startAge); j <= 18; j++) {
                  ageRange.push(j.toString())
                }
                ageRange.push('adults')
              } else {
                for (var k = parseInt(startAge); k <= parseInt(endAge); k++) {
                  ageRange.push(k.toString())
                }
              }
            }

            console.log(ageRange)

            for (let i = 0; i < ageRange.length; i++) {
              if (age[ageRange[i]]) {
                console.log(ageRange[i])
                obj.age = true
                break
              } else obj.age = false
            }
          }

          let result = true
          for (const j in obj) {
            if (obj[j] === false) {
              result = false
              break
            }
          }
          console.log(obj)
          if (result) {
            filteredListings.push(listing)
            return
          }
        }
      })

      console.log(filteredListings)
      return res.status(200).json(filteredListings)
    })
    .catch((err) => {
      console.log(err)
    })
}

exports.getAllListings = (req, res) => {
  db.doc(`/listings/${req.user}`)
    .update({ ...req.body })
    .then(() =>
      res.status(201).json({ message: 'Information successfully updated' })
    )
}

// exports.uploadCompanyDocument = (req, res) => { }
