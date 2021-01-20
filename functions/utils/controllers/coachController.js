const { report } = require('process')
const { db, admin } = require('../admin')
const config = require('../configuration')
const firebase = require('firebase/app')
const { user } = require('firebase-functions/lib/providers/auth')
const { createAwaitingVerification, updateAwaitingVerification } = require('./adminController')
// import 'firebase/firestore'
const nodemailer = require('nodemailer')

exports.getAllAppCoaches = (req, res) => {
  db
    .collection('coaches')
    .get()
    .then((data) => {
      const coaches = []
      data.forEach((doc) => {
        coaches.push({
          coachId: doc.id,
          coachInfo: { ...doc.data() }
        })
      })
      return res.status(200).json(coaches)
    })
    .catch((err) => console.error(err))
}

exports.getAllCoaches = (req, res) => {
  db.collection('users')
    .where('category', '==', 'coach')
    // If data needs to be ordered, use .orderBy(field, desc/asc)
    .get()
    .then((data) => {
      const coaches = []
      // Where doc = QueryDocumentSnapshot, data() returns the object data
      data.forEach((doc) => {
        // console.log(doc.id)
        coaches.push({
          coachId: doc.id,
          coachInfo: { ...doc.data() }
        })
      })
      return res.status(200).json(coaches)
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

exports.addCoachInfo = (req, res) => {
  const requestObject = { ...req.body }
  requestObject.imageURL = `https://firebasestorage.googleapis.com/v0/b/${config.storageBucket}/o/no-img.jpeg?alt=media`

  console.log('start', req.body)
  console.log(req.params.detail)

  db.collection('coaches')
    .add(requestObject)
    .then((data) => {
      requestObject.coachId = data.id

      return (
        db
          // .doc(`coaches/${data.id}`)
          .doc(`coaches/${data.id}`)
          .update({ coachId: data.id })
      )
    })
    .then(() => {
      db.doc(`users/${req.user}`)
        .get()
        .then((data) => {
          let newArr = []
          if (data.data()['category'] === 'company') {
            newArr = [...data.data()['coaches'], requestObject]
            db.doc(`users/${req.user}`).update({
              ['coaches']: newArr
            })
          } else {
            db.doc(`users/${req.user}`).update({
              ['coachInfo']: newArr
            })
          }
        })
        .then(() => {
          res.status(201).json({ message: 'new coach added successfully' })
        })
        .catch((err) => {
          res.status(500).json({
            error: 'Something went wrong, coach could not be added'
          })
          console.error(err)
        })
    })
}

exports.editCoachDetail = (req, res) => {
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
        error: 'Something went wrong, information could not be updated'
      })
    })
}

exports.handleCompanyRequest = (req, res) => {
  // const coachRef = db.doc(`coaches/${req.body.coachId}`)
  const { comapanyEmail, coachName } = req.body
  console.log(req.body)
  const companyRef = db.doc(`users/${req.body.companyId}`)
  const userRef = db.doc(`/users/${req.body.userId}`)
  const accept = req.body.bool

  const userUpdates = accept
    ? {
      companies: admin.firestore.FieldValue.arrayUnion(req.body.companyId),
      requests: admin.firestore.FieldValue.arrayRemove(req.body.companyId)
    }
    : {
      requests: admin.firestore.FieldValue.arrayRemove(req.body.companyId)
    }

  const companyUpdates = accept
    ? {
      coaches: admin.firestore.FieldValue.arrayUnion(req.body.userId),
      sentRequests: admin.firestore.FieldValue.arrayRemove(req.body.userId)
    }
    : {
      sentRequests: admin.firestore.FieldValue.arrayRemove(req.body.userId)
    }

  userRef
    .update(userUpdates)
    .then(() => {
      companyRef.update(companyUpdates)
    })
    .then(() => {

      let output


      if (accept) {
        // if (len === userRef.companies.length) {
        //   res.status(403).json({ message: 'Company already exists' })
        // } else {

        const target =
          type === 'localhost'
            ? 'http://localhost:3000'
            : 'https://football-hub-4018a.firebaseapp.com'

        output = `
    <h2 style='text-align:center'> FT Baller! </h2>
    <p> Hello, ${name}</p>
    <p> ${coachName} has accepted your invitation on FT Baller and has become a member of your training team.</p>
    <p> click the link below to log in and view this on your account</p>
    <a href='${target}/login' target='_blank'>Log in</a>   `

        const transporter = nodemailer.createTransport({
          service: 'gmail',
          auth: {
            user: 'indulgefootballemail@gmail.com',
            pass: 'Indulg3Manchester1'
          }
        })


        const mailOptions = {
          from: 'indulgefootballemail@gmail.com',
          to: comapanyEmail,
          subject: `Coach invitation acceptance from ${coachName}!`,
          html: output
        }

        transporter.sendMail(mailOptions, (err, info) => {
          if (err) {
            return res.status(400).send({ error: err })
          }

          res.send({
            message: 'Message sent: %s',
            messageId: info.messageId,
            previewUrl: 'Preview URL: %s',
            preview: nodemailer.getTestMessageUrl(info)
          })
        })

        res.status(201).json({ message: 'Company added successfully' })
        // }
      } else {
        res.status(201).json({ message: 'Offer declined' })
      }
    })
    .catch((err) => {
      console.log(err)
      res.status(500).json({
        error: 'Something went wrong, information could not be updated'
      })
    })
}

// exports.acceptCompanyRequest = (req, res) => {
//   // const coachRef = db.doc(`coaches/${req.body.coachId}`)
//   const companyRef = db.doc(`users/${req.body.companyId}`)
//   const userRef = db.doc(`/users/${req.body.userId}`)

//   const len = userRef.companies.length

//   userRef
//     .update({
//       companies: firebase.firestore.FieldValue.arrayUnion(req.body.companyId),
//       requests: firebase.firestore.FieldValue.arrayRemove(req.body.companyId)
//     })
//     .then(() => {
//       companyRef.update({
//         coaches: firebase.firestore.FieldValue.arrayUnion(req.body.coachId),
//         sentRequests: firebase.firestore.FieldValue.arrayRemove(
//           req.body.coachId
//         )
//       })
//     })
//     .then(() => {
//       if (len === userRef.companies.length) {
//         res.status(403).json({ message: 'Company already exists' })
//       } else {
//         res.status(201).json({ message: 'Company added successfully' })
//       }
//     })
//     .catch((err) => {
//       console.log(err)
//       res.status(500).json({
//         error: 'Something went wrong, information could not be updated'
//       })
//     })


// .get()
// .then((data) => {
//   // const toBeUpdated = data.data()['companies']
//   // if (toBeUpdated.some(company => company.companyId === req.body.companyId)) {
//   //   existing = true
//   // } else {
//   //   db.doc(`coaches/${req.coachId}`).update({
//   //     companies: [...toBeUpdated, req.body.companyId]
//   //   })
//   // }

// })
// .then(() => {
//   if (existing) {
//     res.status(403).json({ message: 'Company already exists' })
//   } else {
//     res.status(201).json({ message: 'Company added successfully' })
//   }
// })
// .catch((err) => {
//   console.log(err)
//   res.status(500).json({
//     error: 'Something went wrong, information could not be updated',
//   })
// })


exports.uploadCoachDocument = (req, res) => {
  const BusBoy = require('busboy')
  const path = require('path')
  const os = require('os')
  const fs = require('fs')
  const busboy = new BusBoy({ headers: req.headers })
  console.log('pre-file')
  let documentFileName
  const { documentType } = req.params
  let documentToBeUploaded = {}

  busboy.on('file', (fieldname, file, filename, encoding, mimetype) => {
    console.log('file')
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
    return admin
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
        const docref = db.doc(`users/${req.user}`)
        return docref
          .update({
            [`coachInfo.${documentType}`]: documentURL
          })
          .then(() => {
            console.log('here')
            return docref.get().then((data) => {
              req.info = data.data()
              req.type = 'coachInfo'
              if (
                req.info.coachInfo.dbsCertificate &&
                req.info.coachInfo.coachingCertificate &&
                (!req.info.verificationId || req.info.verificationId.coachInfo === '')
              ) {
                console.log('creating')
                createAwaitingVerification(req, res)
              } else if (req.info.coachInfo.dbsCertificate &&
                req.info.coachInfo.coachingCertificate &&
                req.info.verificationId.coachInfo !== '') {
                console.log('updating')
                updateAwaitingVerification(req, res)
              } else {
                console.log('non')
                res.send(req.info)
              }
            })
          })
      })
  })
  busboy.end(req.rawBody)
}


exports.searchForCoaches = (req, res) => {

  const { query } = req.params
  const coachArray = []
  const userRef = db.collection('users').where('category', '==', 'coach')

  return userRef.orderBy('name').startAt(query).endAt(`${query}\uf8ff`).get()
    .then(list => {
      list.forEach(item => {
        coachArray.push(item.data())
      })
      res.status(201).json(coachArray)
    })
    .catch(err => console.log(err))
}

    // console.log('changing obj', changingObj)

    // changingObj.documents[documentType] = documentURL

// db.doc(`coaches/${req.params.id}`)
          //   .update(changingObj)
//   .then(() => {
//     db.doc(`users/${req.user}`)
//       .update({
//         coaches: [...nonChangingArr, changingObj]
//       })
//       .then(() => {
//         res
//           .status(201)
//           .json({ message: 'information updated successfully', documents: changingObj.documents })
//       })
//       .catch((err) => {
//         console.log(err)
//       })
//   })
// })

// exports.dataDeletion = (req, res) => {
//   const { id, detail } = req.params
//   db.collection(detail)
//     .doc(id)
//     .delete()
//     .then(() => {
//       db.doc(`users/${req.user}`)
//         .get()
//         .then((data) => {
//           const nonChangingArr = data.data()[detail].filter((el) => {
//             //return el[detail === "coaches" ? "coachId" : "serviceId"] !== id;
//             if (detail === "coaches") {
//               return el.coachId !== id;
//             } else if (detail === "services") {
//               return el.serviceId !== id;
//             } else {
//               return el.courseId !== id;
//             }
//           });
//           return db
//             .doc(`/users/${req.user}`)
//             .update({ [detail]: nonChangingArr })
//             .then(() => {
//               res
//                 .status(201)
//                 .json({ message: 'information deleted successfully' })
//             })
//             .catch((err) => {
//               console.log(err)
//               res.status(500).json({
//                 error: 'Something went wrong, information could not be deleted',
//               })
//             })
//         })
//     })
// }

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

// exports.coachImageUpload = (req, res) => {

//   // HTML form data parser for Nodejs
//   const BusBoy = require('busboy')
//   const path = require('path')
//   const os = require('os')
//   const fs = require('fs')
//   const busboy = new BusBoy({ headers: req.headers })

//   let imageFileName
//   let imageToBeUploaded = {}

//   busboy.on('file', (fieldname, file, filename, encoding, mimetype) => {
//     // Grabbing the file extension
//     const fileSplit = filename.split('.')
//     const imageExtension = fileSplit[fileSplit.length - 1]

//     // Generating new file name with random numbers
//     imageFileName = `${Math.round(
//       Math.random() * 10000000000
//     )}.${imageExtension}`
//     // Creating a filepath for the image and storing it in a temporary directory
//     const filePath = path.join(os.tmpdir(), imageFileName)
//     imageToBeUploaded = { filePath, mimetype }

//     // Using file system library to create the file
//     file.pipe(fs.createWriteStream(filePath))
//   })
//   // Function to upload image file on finish
//   busboy.on('finish', () => {
//     admin
//       .storage()
//       .bucket()
//       .upload(imageToBeUploaded.filePath, {
//         resumable: false,
//         metadata: {
//           metadata: {
//             contentType: imageToBeUploaded.mimetype
//           }
//         }
//       })
//       .then(() => {
//         const imageURL = `https://firebasestorage.googleapis.com/v0/b/${config.storageBucket}/o/${imageFileName}?alt=media`

//         db.doc(`users/${req.user}`)
//           .get()
//           .then((data) => {
//             const nonChangingArr = []
//             let changingObj

//             data.data().coaches.map((el) => {
//               if (el.coachId !== req.params.id) {
//                 nonChangingArr.push(el)
//               } else changingObj = el
//             })

//             const updatedObj = { ...changingObj, imageURL }

//             db.doc(`coaches/${req.params.id}`)
//               .update(updatedObj)
//               .then(() => {
//                 db.doc(`users/${req.user}`)
//                   .update({
//                     coaches: [...nonChangingArr, updatedObj]
//                   })
//                   .then(() => {
//                     res
//                       .status(201)
//                       .json({ message: imageURL })
//                   })
//                   .catch((err) => {
//                     console.log(err)
//                   })
//               })
//           })
//       })
//   })
//   busboy.end(req.rawBody)
// }

// exports.filterListingCompanies = (req, res) => {

//   const deg2rad = (deg) => {
//     return deg * (Math.PI / 180)
//   }

//   const getDistance = (lat1, lon1, lat2, lon2) => {
//     const R = 6371 // Radius of the earth in km
//     const dLat = deg2rad(lat2 - lat1)  // deg2rad below
//     const dLon = deg2rad(lon2 - lon1)
//     const a =
//       Math.sin(dLat / 2) * Math.sin(dLat / 2) +
//       Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) *
//       Math.sin(dLon / 2) * Math.sin(dLon / 2)
//     const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
//     const d = R * c // Distance in km
//     return d.toFixed()
//   }

//   function cleanObject(obj) {
//     for (var propName in obj) {
//       if (!obj[propName]) delete obj[propName]
//       else if (typeof obj[propName] === 'object') cleanObject(obj[propName])
//     }
//     return obj
//   }

//   const filteredObject = cleanObject(req.body)

//   db
//     .collection('users')
//     .where('category', '==', 'company')
//     .get()
//     .then((data) => {
//       const companies = []
//       data.forEach((doc) => {
//         companies.push({
//           companyId: doc.id,
//           companyInfo: { ...doc.data() }
//         })
//       })

//       const filteredListingsByLocation = []
//       const { timing, location, age } = filteredObject
//       const days = Object.keys(timing.days).length === 0
//       const times = Object.keys(timing.times).length === 0
//       const ages = Object.keys(age).length === 0

//       companies.map(company => {

//         const obj = {}
//         if (location.longitude) {
//           const { latitude, longitude } = company.companyInfo.location
//           const dis = getDistance(
//             location.latitude,
//             location.longitude,
//             latitude, longitude)
//           console.log(dis)
//           if (parseInt(dis) < 20) obj.location = true
//           else obj.location = false
//         }

//         if (!days) {
//           const { courses } = company.companyInfo
//           courses.map(course => {
//             const { sessions, courseType } = course.courseDetails
//             if (courseType.toLowerCase() === 'weekly') {
//               sessions.map(el => {
//                 if (timing.days[el.day.toLowerCase()]) {
//                   obj.days = true
//                   return
//                 } else {
//                   obj.days = false
//                   return
//                 }
//               })
//             }
//           })
//         }

//         if (!times) {

//           const { courses } = company.companyInfo
//           courses.map(el => {
//             const { sessions, courseType } = el.courseDetails
//             if (courseType.toLowerCase() === 'weekly') {
//               sessions.map(el => {
//                 const { startTime } = el
//                 const time = parseInt(startTime.charAt(0))

//                 // morning filteration
//                 if (timing.times['morning']) {
//                   if (startTime.includes('am')) {
//                     obj.times = true
//                     return
//                   } else obj.times = false
//                 }
//                 // afternoon filteration
//                 if (timing.times['afternoon']) {
//                   if (startTime.includes('pm') && (time === 12 || (time >= 1 && time < 6))) {
//                     obj.times = true
//                     return
//                   } else obj.times = false
//                 }
//                 // evening filteration
//                 if (timing.times['evening']) {
//                   if (startTime.includes('pm') && (time >= 6 && time < 10)) {
//                     obj.times = true
//                     return
//                   } else obj.times = false
//                 }
//               })
//             }
//           })
//         }

//         // age filteration
//         if (!ages) {
//           const { ageDetails } = company.companyInfo
//           const ageRange = []
//           ageDetails.map(el => {

//             if (el.startAge !== 'Adults' && el.endAge !== 'Adults') {
//               for (var i = parseInt(el.startAge); i <= parseInt(el.endAge); i++) {
//                 ageRange.push(i.toString())
//               }
//             } else if (el.startAge === 'Adults' && el.endAge === 'Adults') {
//               ageRange.push('adults')
//             } else {
//               if (el.startAge === 'Adults') {
//                 ageRange.push('adults')
//                 ageRange.push(el.endAge)
//               } else {
//                 ageRange.push('adults')
//                 ageRange.push(el.startAge)
//               }
//             }

//           })

//           console.log(ageRange)
//           console.log(age)
//           for (let i = 0; i < ageRange.length; i++) {
//             if (age[ageRange[i]]) {
//               obj.age = true
//               break
//             } else obj.age = false
//           }
//         }

//         let result = true
//         for (const i in obj) {
//           if (obj[i] === false) {
//             result = false
//             break
//           }
//         }
//         console.log(obj)
//         if (result) filteredListingsByLocation.push(company)
//       })

//       return res.status(200).json(filteredListingsByLocation)
//     })
//     .catch((err) => {
//       console.log(err)
//     })
// }
