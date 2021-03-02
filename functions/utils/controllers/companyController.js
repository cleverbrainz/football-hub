/* eslint-disable comma-dangle */
// const { report } = require('process')
const { db, admin } = require('../admin')
const config = require('../configuration')
const moment = require('moment')
const {
  createAwaitingVerification,
  updateAwaitingVerification,
} = require('./adminController')
// const firebase = require('firebase/app')
const nodemailer = require('nodemailer')
const stripe = require('stripe')('sk_test_9uKugMoJMmbu03ssvVn9KXUE')
// require('firebase/firestore')

const { validateEmailAddressInput } = require('../validators')
const { sendEmailNotificationCoach } = require('./notificationController')

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
          companyInfo: { ...doc.data() },
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
      res.status(201).json({ message: `${data.id} company successfully added` })
    })
    .catch((err) => {
      res
        .status(500)
        .json({ error: 'Something went wrong, company could not be added' })
      console.error(err)
    })
}

exports.ageDetails = (req, res) => {
  if (req.method === 'POST') {
    db.doc(`users/${req.user}`)
      .get()
      .then((data) => {
        const ageArr = data.data().ageDetails
          ? [...data.data().ageDetails].concat(req.body)
          : [...req.body]

        db.doc(`users/${req.user}`)
          .update({ ageDetails: ageArr })
          .then(() => {
            res
              .status(201)
              .json({ message: 'Age information updated successfully' })
          })
          .catch((err) => {
            console.log(err)
          })
      })
  } else {
    db.doc(`users/${req.user}`)
      .get()
      .then((data) => {
        const ageArr = data.data().ageDetails.filter((el) => {
          console.log(el)
          return (
            el.startAge !== req.body.startAge || el.endAge !== req.body.endAge
          )
        })

        console.log(ageArr)
        console.log(req.body)

        db.doc(`users/${req.user}`)
          .update({ ageDetails: ageArr })
          .then(() => {
            res
              .status(201)
              .json({ message: 'Age information updated successfully' })
          })
          .catch((err) => {
            console.log(err)
          })
      })
  }
}

exports.addNewListing = (req, res) => {
  const listingObj = { ...req.body }

  return db
    .collection('listings')
    .add(listingObj)
    .then((data) => {
      listingObj.id = data.id
      return db.doc(`/listings/${data.id}`).update({ listingId: data.id })
    })
    .then(() => {
      return db.doc(`/users/${listingObj.companyId}`).update({
        listings: admin.firestore.FieldValue.arrayUnion(listingObj.id),
      })
    })
    .then(() => res.status(201).json({ message: 'listing added' }))
    .catch((err) => res.status(400).send(err))
}

exports.getSingleListing = (req, res) => {
  console.log(req.params)
  return db
    .doc(`/listings/${req.params.listingId}`)
    .get()
    .then((data) => {
      const response = data.data()
      console.log(response)
      res.status(201).json(response)
    })
    .catch((error) => console.log(error))
}

exports.updateLiveListings = (req, res) => {
  const promises = []
  req.body.updates.forEach(([id, status]) => {
    promises.push(db.doc(`/listings/${id}`).update({ status: status }))
  })
  Promise.all(promises)
    .then(() => {
      res.status(201).json({ message: 'updated' })
    })
    .catch((err) => res.status(404).json({ err: err }))
}

async function createStripeProduct(course, courseId) {
  const { companyId, courseDetails } = course
  const {
    allow_weekly_payment,
    cost,
    startDate,
    endDate,
    optionalName,
    courseType,
  } = courseDetails
  const prices = []
  const difference = moment(courseDetails.endDate).diff(
    courseDetails.startDate,
    'weeks'
  )


  let costInteger = cost.split('')
  let removedDecimal = false

  for (const char of costInteger) {
    if (char === '.') {
      costInteger.splice(costInteger.indexOf(char), 1)
      removedDecimal = true
    }
  }
  console.log('1', costInteger)
  costInteger = removedDecimal ? Number(costInteger.join('')) : Number([...costInteger, '00'].join(''))
  prices.push(costInteger)


  if (allow_weekly_payment) {
    const weeklyPrice = Math.ceil(costInteger / difference)
    prices.push(Math.ceil(weeklyPrice))
  }

  const data = await db.doc(`users/${companyId}`).get()
  const name = await data.data().name

  const product = await stripe.products.create({
    name: `${name} - ${optionalName} ${courseType.toLowerCase()}`,
    metadata: {
      companyId,
      courseId,
    },
    description: `${startDate} - ${endDate}`,
  })

  prices.forEach(async (el, i) => {
    console.log(el)
    await stripe.prices.create({
      unit_amount: el,
      currency: 'gbp',
      ...(prices.length > 1 &&
        i === 1 && {
        recurring: {
          interval: 'week',
        },
      }),
      metadata: {
        course_duration: `${difference} weeks`,
        start_date: startDate,
        end_date: endDate,
      },
      nickname:
        prices.length > 1 && i === 1 ? 'Subscription Price' : 'One-off Price',
      product: product.id,
    })
  })

  return product.id
}

exports.addNewDetail = (req, res) => {
  const getDaysArray = function (start, end) {
    for (
      var arr = [], dt = new Date(start);
      dt <= end;
      dt.setDate(dt.getDate() + 1)
    ) {
      arr.push(new Date(dt))
    }
    return arr
  }

  const requestObject = { ...req.body }

  if (req.params.detail === 'courses') {
    const days = [
      'Sunday',
      'Monday',
      'Tuesday',
      'Wednesday',
      'Thursday',
      'Friday',
      'Saturday',
    ]
    const { sessions, startTime, endTime, spaces } = requestObject.courseDetails

    const {
      courseType,
      startDate,
      endDate,
      excludeDays,
    } = req.body.courseDetails

    if (courseType === 'Camp') {
      getDaysArray(new Date(startDate), new Date(endDate)).map((el) => {
        if (!excludeDays.includes(days[el.getDay()])) {
          sessions.push({
            sessionDate: el,
            startTime,
            endTime,
            spaces,
          })
        }
      })
    }
  }

  if (req.params.detail === 'contact') {
    delete req.body.companyId

    db.doc(`users/${requestObject.companyId}`)
      .update({ contactInformation: req.body })
      .then(() => {
        res.status(201).json({ message: 'new message added successfully' })
      })
      .catch(() => {
        res.status(500).json({
          error: 'Something went wrong, enquiry could not be added',
        })
      })
  } else {
    db.collection(req.params.detail)
      .add(requestObject)
      .then(async (data) => {
        let detailId

        const idArr = [
          'coaches',
          'services',
          'locations',
          'courses',
          'listings',
        ]
        if (idArr.includes(req.params.detail)) {
          detailId =
            req.params.detail === 'coaches'
              ? 'coach'
              : req.params.detail.slice(0, -1) + 'Id'
        }

        requestObject[detailId] = data.id

        if (detailId === 'coachId') {
          const noImg = 'no-img.jpeg'
          requestObject.imageURL = `https://firebasestorage.googleapis.com/v0/b/${config.storageBucket}/o/${noImg}?alt=media`
        } else if (detailId === 'courseId') {
          requestObject.coaches = []
        }

        if (req.params.detail === 'courses') {
          const product = await createStripeProduct(req.body, data.id)
          const productId = await product
          console.log(productId)
          requestObject.stripe_product_id = productId
        }

        console.log('stepppp1')

        return db
          .doc(`${req.params.detail}/${data.id}`)
          .update({ [detailId]: data.id })
      })
      .then(() => {
        console.log('stepppp2')
        db.doc(`users/${req.body.companyId}`)
          .get()
          .then((data) => {
            let newArr = []
            const previous =
              req.params.detail === 'courses'
                ? data.data().courses.active
                : data.data()[req.params.detail]
            const updateString =
              req.params.detail === 'courses'
                ? 'courses.active'
                : req.params.detail
            if (previous) {
              newArr = [...previous, requestObject]
              console.log(newArr)
            } else {
              newArr = [requestObject]
              console.log('prev')
            }

            db.doc(`users/${req.body.companyId}`).update({
              [updateString]: newArr,
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
}

exports.retrieveCompanyCourses = (req, res) => {
  const { courses, company, type } = req.body
  const promises = courses.map((course) => {
    return db
      .doc(`courses/${course}`)
      .get()
      .then((data) => {
        return data.data()
      })
  })
  Promise.all(promises)
    .then((courseArray) => {
      db.doc(`users/${company}`)
        .get()
        .then((data) => {
          let updatedCourses
          const companyData = data.data()
          if (companyData.courses[type]) {
            updatedCourses = [...companyData.courses[type], ...courseArray]
            console.log('merged', updatedCourses)
          } else {
            updatedCourses = [...courseArray]
            console.log('fresh', updatedCourses)
          }
          db.doc(`users/${company}`).update({
            [`courses.${type}`]: updatedCourses,
          })
        })
    })
    .then(() => {
      res.status(201).send({ message: 'sorted!' })
    })
}

exports.sendCoachRequest = (req, res) => {
  console.log(req.body)
  const { coachName, coachEmail, type } = req.body
  const target =
    type === 'localhost'
      ? 'http://localhost:3000'
      : 'https://football-hub-4018a.firebaseapp.com'
  const firstName = coachName.split(' ')[0]
  const coachRef = db.doc(`/users/${req.body.coachId}`)
  const userRef = db.doc(`/users/${req.body.companyId}`)

  coachRef
    .update({
      requests: admin.firestore.FieldValue.arrayUnion(req.body.companyId),
    })
    .then(() => {
      userRef.update({
        sentRequests: admin.firestore.FieldValue.arrayUnion(req.body.coachId),
      })
    }).then(() => {
      userRef.get().then((data) => {
        const userCompany = data.data().name

        const transporter = nodemailer.createTransport({
          service: 'gmail',
          auth: {
            user: 'indulgefootballemail@gmail.com',
            pass: '1ndulgeManchester1',
          },
        })

        const mailOptions = {
          from: 'indulgefootballemail@gmail.com',
          to: `${coachName} <${coachEmail}>`,
          subject: `Baller Hub connection request from ${userCompany}!`,
          html: `
      <h2 style='text-align:center'>Greetings from ${userCompany}! </h2>
      <p> Hello ${firstName}! </p>
      <p> ${userCompany} wants to connect with you on Baller Hub for football training in the future.</p>
      <p> click the link below to head to Baller Hub and connect with ${userCompany}.</p>
      <a href='${target}/login' target="_blank">Log in and confirm the request!</a>
    `,
        }

        return transporter.sendMail(mailOptions)
      })
        .then(emailInfo => {
          res
            .status(201)
            .json({ message: 'request sent successfully', emailInfo })
        })
        .catch((err) => {
          res.status(500).json({
            error: 'Something went wrong, enquiry could not be added',
          })
          console.error(err)
        })
    })
}

exports.deleteCoachRequest = (req, res) => {
  console.log('boo', req.body)
  const coachRef = db.doc(`/users/${req.body.coachId}`)
  const userRef = db.doc(`/users/${req.body.companyId}`)

  coachRef
    .update({
      requests: admin.firestore.FieldValue.arrayRemove(req.body.companyId),
    })
    .then(() => {
      userRef.update({
        sentRequests: admin.firestore.FieldValue.arrayRemove(req.body.coachId),
      })
    })
    .then(() => {
      res.status(201).json({ message: 'request sent successfully' })
    })
    .catch((err) => {
      res.status(500).json({
        error: 'Something went wrong, enquiry could not be added',
      })
      console.error(err)
    })
}

async function updateCompanyInfo(userId, updatedObject, type, request) {
  const data = db.doc(`users/${userId}`).get()
  const promise = await data

  const updateUser = (type, originalArr, nonChanging) => {
    db.doc(`/users/${userId}`)
      .update({
        [type]:
          type !== 'courses'
            ? [...nonChanging, ...(request === 'patch' ? [updatedObject] : [])]
            : { ...originalArr, active: [...nonChanging, updatedObject] },
      })
      .then(() => {
        console.log('USER UPDATEDD BITCH')
      })
  }

  switch (type) {
    case 'courses':
      {
        const { courses } = await promise.data()
        const { active } = courses

        active.forEach(async (el) => {
          if (el.courseId === updatedObject.courseId) {
            const { allow_weekly_payment, cost } = el.courseDetails
            const { startDate, endDate } = updatedObject.courseDetails

            // checks if company has now allowed weekly payments
            if (
              allow_weekly_payment !==
              updatedObject.courseDetails.allow_weekly_payment
            ) {
              // console.log(allow_weekly_payment, updatedObject.courseDetails.allow_weekly_payment)

              let costInteger = cost.split('')
              let removedDecimal = false

              for (const char of costInteger) {
                if (char === '.') {
                  costInteger.splice(costInteger.indexOf(char), 1)
                  removedDecimal = true
                }
              }
              console.log('2', costInteger)
              costInteger = removedDecimal ? Number(costInteger.join('')) : Number([...costInteger, '00'].join(''))

              const difference = moment(endDate).diff(startDate, 'weeks')
              const weeklyPrice = Math.ceil(costInteger / difference)

              await stripe.prices.create({
                unit_amount: weeklyPrice,
                currency: 'gbp',
                recurring: {
                  interval: 'week',
                },
                metadata: {
                  course_duration: `${difference} weeks`,
                  start_date: startDate,
                  end_date: endDate,
                },
                nickname: 'Subscription Price',
                product: el.stripe_product_id,
              })
            }
          }
        })

        const nonChanging = active.filter(
          (el) => el.courseId !== updatedObject.courseId
        )
        updateUser(type, courses, nonChanging)
      }

      break

    case 'services':
      {
        const { services } = await promise.data()
        const id = request === 'patch' ? updatedObject.serviceId : updatedObject
        const nonChanging = services.filter((el) => el.serviceId !== id)

        // console.log(updatedObject)
        console.log('THIS', nonChanging)

        updateUser(type, services, nonChanging)
      }
      break
    default:
      break
  }

  return promise.data()
}

async function updateListings(listingArr, updatedObject, type, request) {
  db.collection('listings')
    .get()
    .then((data) => {
      data.forEach((doc) => {
        const el = doc.data()
        const { listingId, camps, courses, services } = el

        if (listingArr.includes(listingId)) {
          switch (type) {
            case 'courses':
              {
                console.log('EDITTTTT COURSES STEP 2')
                // either array should be one less with the matching course removed
                const isCamp = camps.filter((camp) =>
                  (camp.courseId !== request) === 'patch'
                    ? updatedObject.courseId
                    : updatedObject
                )
                const isCourse = courses.filter((course) =>
                  (course.courseId !== request) === 'patch'
                    ? updatedObject.courseId
                    : updatedObject
                )

                if (isCamp.length < camps.length) {
                  db.doc(`listings/${el.listingId}`).update({
                    camps: [
                      ...isCamp,
                      ...(request === 'patch' ? [updatedObject] : []),
                    ],
                  })
                }

                if (isCourse.length < courses.length) {
                  db.doc(`listings/${listingId}`).update({
                    courses: [
                      ...isCourse,
                      ...(request === 'patch' ? [updatedObject] : []),
                    ],
                  })
                }
              }
              break

            case 'services':
              {
                const nonChanging = services.filter((el) =>
                  (el.serviceId !== request) === 'patch'
                    ? updatedObject.serviceId
                    : updatedObject
                )

                if (nonChanging.length < services.length) {
                  db.doc(`listings/${listingId}`).update({
                    services: [
                      ...nonChanging,
                      ...(request === 'patch' ? [updatedObject] : []),
                    ],
                  })
                }
              }

              break

            default:
              break
          }
        }
      })
    })
}

exports.editCompanyDetail = async (req, res) => {
  console.log('EDITTTTT COMPANY DETAILSSSSSSS')

  const { detail } = req.params

  switch (detail) {
    case 'contact':
      delete req.body.companyId
      db.doc(`users/${req.user}`)
        .update({ contactInformation: req.body })
        .then(() =>
          res.status(201).json({ message: 'new message updated successfully' })
        )
        .catch(() =>
          res
            .status(500)
            .json({ error: 'Something went wrong, enquiry could not be added' })
        )
      break

    case 'courses':
      {
        console.log('EDITTTTT COURSES STEP 1')
        const { user, body } = req
        const { courseId } = body

        const data = updateCompanyInfo(user, body, detail, 'patch')
        const { listings } = await data

        db.doc(`courses/${courseId}`)
          .update(req.body)
          .then(() => updateListings(listings, body, detail))
          .then(() => {
            res
              .status(201)
              .json({ message: 'information updated successfully' })
          })
          .catch((err) => {
            console.log(err)
            res.status(500).json({
              error: 'Something went wrong, information could not be updated',
            })
          })
      }
      break

    case 'services':
      {
        console.log(req)
        const { user, body } = req
        const { serviceId } = body
        const data = updateCompanyInfo(user, body, detail, 'patch')
        const { listings } = await data

        db.doc(`services/${serviceId}`)
          .update(req.body)
          .then(() => updateListings(listings, body, detail))
          .then(() => {
            res
              .status(201)
              .json({ message: 'information updated successfully' })
          })
          .catch((err) => {
            console.log(err)
            res.status(500).json({
              error: 'Something went wrong, information could not be updated',
            })
          })
      }
      break

    case 'listings':
      {
        const { body } = req
        const { listingId } = body

        db.doc(`/listings/${listingId}`)
          .update(body)
          .then(() => res.status(200).json({ message: 'Updated listing' }))
      }
      break

    default:
      break
  }
}

exports.deleteCourse = (req, res) => {
  const { id } = req.params
  console.log(req.user, id)

  db.doc(`courses/${id}`)
    .get()
    .then((data) => {
      const { playerList } = data.data()

      if (!playerList || playerList.length === 0) {
        db.doc(`courses/${id}`)
          .delete()
          .then(() => {
            db.doc(`users/${req.user}`)
              .get()
              .then((data) => {
                const userData = data.data()
                const courses = [...userData.courses.active]
                const coaches = []
                const listings = userData.listings
                let index
                for (const course of courses) {
                  if (course.courseId === id) {
                    coaches.concat(course.coaches)
                    index = courses.indexOf(course)
                  }
                }
                courses.splice(index, 1)

                const promises = []

                promises.push(
                  db
                    .doc(`users/${req.user}`)
                    .update({ 'courses.active': courses })
                )

                coaches.forEach((coach) => {
                  promises.push(
                    db
                      .doc(`/users/${coach}`)
                      .get()
                      .then((data) => {
                        const coachData = data.data()
                        let updatedCourses =
                          coachData.userId === req.user
                            ? [...coachData.coursesCoaching[req.user].active]
                            : [...coachData.courses[req.user].active]
                        const updateString =
                          coachData.userId === req.user
                            ? 'coursesCoaching'
                            : 'courses'
                        updatedCourses = updatedCourses.filter(
                          (course) => course !== id
                        )

                        return db
                          .doc(`/users/${coach}`)
                          .update({
                            [`${updateString}.${req.user}.active`]: updatedCourses,
                          })
                      })
                  )
                })
                listings.forEach((listing) => {
                  promises.push(
                    db
                      .doc(`/listings/${listing}`)
                      .get()
                      .then((data) => {
                        const listingData = data.data()
                        const updatedCourses = [...listingData.courses].filter(
                          (course) => course.courseId !== id
                        )

                        return db
                          .doc(`/listings/${listing}`)
                          .update({ courses: updatedCourses })
                      })
                  )
                })
                Promise.all(promises).then(() =>
                  res
                    .status(200)
                    .json({ message: 'sucessfully deleted course' })
                )
              })
          })
      } else {
        res
          .status(400)
          .json({
            message:
              'cannot be deleted as already have bookings, please cancel the course and try again',
          })
      }
    })
    .catch((err) => console.log(err))
}

exports.deleteCompanyDetail = async (req, res) => {
  const { id, detail } = req.params
  const { user } = req

  // id = id of object to be deleted
  // detail = the type of thing that needs to be deleted, course etc..

  switch (detail) {
    case 'services':
      {
        console.log('services')
        // delete from services collection
        // delete from user in services array
        // delete from listing in listing collection
        const data = updateCompanyInfo(user, id, detail, 'delete')
        const { listings } = await data
        db.doc(`services/${id}`)
          .delete()
          .then(() => updateListings(listings, id, detail, 'delete'))
          .then(() => {
            res.status(201).json({ message: 'service deleted' })
          })
          .catch((err) => {
            console.log(err)
            res.status(500).json({
              error: 'Something went wrong, information could not be updated',
            })
          })
      }

      break

    case 'listings': {
      // delete from listings collection
      // delete id from listings arr in user
      const promises = []

      promises.push(db.doc(`users/${user}`)
        .update({ listings: admin.firestore.FieldValue.arrayRemove(id) }))

      promises.push(
        db.doc(`listings/${id}`)
          .delete())

      Promise.all(promises)
        .then(() => {
          res
            .status(201)
            .json({ message: 'listing deleted' })
        })
        .catch(() => {
          res.status(500).json({
            error: 'Something went wrong, lising could not be deleted'
          })
        })

    }

      break

    default:
      break
  }

  // db.collection(detail)
  //   .doc(id)
  //   .delete()
  //   .then(() => {
  //     db.doc(`users/${req.user}`)
  //       .get()
  //       .then((data) => {
  //         const { courses } = data.data()
  //         const arrayToFilter =
  //           detail === 'courses'
  //             ? data.data()[detail].active
  //             : data.data()[detail]
  //         const nonChangingArr = arrayToFilter.filter((el) => {
  //           const idArr = [
  //             'coaches',
  //             'services',
  //             'locations',
  //             'courses',
  //             'listings',
  //           ]
  //           if (idArr.includes(detail)) {
  //             const text = detail === 'coaches' ? 'coach' : detail.slice(0, -1)
  //             return el[`${text}Id`] !== id
  //           }
  //         })
  //         const { listings } = data.data()
  //         let courseType = null
  //         const courseFilterArr = ['courses', 'camps']

  //         courseFilterArr.forEach((el) => {
  //           for (let i = 0; i < listings[0][el].length; i++) {
  //             const { courseId } = listings[0][el][i]
  //             if (courseId === id) {
  //               courseType = el
  //               break
  //             }
  //           }
  //         })

  //         if (courseType || detail === 'services') {
  //           detail === 'services' ? (courseType = 'services') : courseType
  //           const nonChangingCoursesArr = listings[0][courseType].filter(
  //             (el) => el[`${detail.slice(0, -1)}Id`] !== id
  //           )

  //           db.doc(`/users/${req.user}`)
  //             .update({
  //               listings: [
  //                 {
  //                   ...listings[0],
  //                   [courseType]: nonChangingCoursesArr,
  //                 },
  //               ],
  //             })
  //             .then(() => {
  //               db.doc(`/listings/${listings[0].listingId}`).update({
  //                 [courseType]: nonChangingCoursesArr,
  //               })
  //             })
  //         }

  //         return db
  //           .doc(`/users/${req.user}`)
  //           .update(
  //             detail === 'courses'
  //               ? { [detail]: { ...courses, active: nonChangingArr } }
  //               : { [detail]: nonChangingArr }
  //           )
  //           .then(() => {
  //             res
  //               .status(201)
  //               .json({ message: 'information deleted successfully' })
  //           })
  //           .catch((err) => {
  //             console.log(err)
  //             res.status(500).json({
  //               error: 'Something went wrong, information could not be deleted',
  //             })
  //           })
  //       })
  //   })
}

exports.uploadCompanyDocument = (req, res) => {
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
        const docref = db.doc(`users/${req.user}`)
        const documentChanged = documentType === 'professional_indemnity_insurance' ? 'indemnityDocumentCheck' : 'liabilityDocumentCheck'
        docref
          .update({
            [`documents.${documentType}`]: documentURL,
            [`verification.${documentChanged}`]: false
          })
          .then(() => {
            console.log('just upload not verify')
            docref.get().then((data) => {
              req.info = data.data()
              //   req.type = 'companyInfo'
              //   if (
              //     req.info.documents.public_liability_insurance &&
              //     req.info.documents.professional_indemnity_insurance &&
              //     (!req.info.verificationId ||
              //       !req.info.verificationId.companyInfo)
              //   ) {
              //     return createAwaitingVerification(req, res)
              //   } else if (req.info.verificationId && req.info.verificationId.companyInfo) {
              //     return updateAwaitingVerification(req, res)
              //   } else {
              return res
                .status(201)
                .json({ message: 'file uploaded', data: req.info })
            })
          })
      })
  })
  //     })
  // }))
  busboy.end(req.rawBody)
}

exports.oldUploadCoachDocument = (req, res) => {
  // exports.uploadCoachDocument = (req, res) => {
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
              ...changingObj,
              documents: changingObj.documents
                ? [...changingObj.documents, documentURL]
                : [documentURL],
            }

            db.doc(`coaches/${req.params.id}`)
              .update(updatedObj)
              .then(() => {
                db.doc(`users/${req.user}`)
                  .update({
                    coaches: [...nonChangingArr, changingObj],
                    // coaches: [...nonChangingArr, updatedObj],
                  })
                  .then(() => {
                    res.status(201).json({
                      message: 'information updated successfully',
                      documents: changingObj.documents,
                    })
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

// exports.uploadCompanyDocument = (req, res) => { }

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
            contentType: imageToBeUploaded.mimetype,
          },
        },
      })
      .then(() => {
        const imageURL = `https://firebasestorage.googleapis.com/v0/b/${config.storageBucket}/o/${imageFileName}?alt=media`

        db.doc(`users/${req.user}`)
          .update({ 'coachInfo.imageURL': imageURL })
          .then(() => {
            res.status(201).json({ message: imageURL })
          })
          .catch((err) => {
            console.log(err)
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
    const dLat = deg2rad(lat2 - lat1) // deg2rad below
    const dLon = deg2rad(lon2 - lon1)
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(deg2rad(lat1)) *
      Math.cos(deg2rad(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2)
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

  db.collection('listings')
    .get()
    .then((data) => {
      const listings = []
      data.forEach((doc) => {
        if (doc.data().status === 'live') {
          listings.push({
            listingInfo: { ...doc.data() },
          })
        }
      })

      console.log(listings)

      const filteredListings = []
      // fitler specifications
      const { timing, location, age } = filteredObject
      const days = Object.keys(timing.days).length === 0
      const times = Object.keys(timing.times).length === 0
      const ages = Object.keys(age).length === 0

      // console.log(filteredObject)

      listings.map((listing) => {
        for (let i = 0; i < listing.listingInfo.courses.length; i++) {
          const { courseDetails } = listing.listingInfo.courses[i]
          const { sessions, courseType } = courseDetails
          const obj = {}

          if (location.longitude) {
            for (let j = 0; j < sessions.length; j++) {
              const { longitude, latitude } = sessions[j]
              const dis = getDistance(
                location.latitude,
                location.longitude,
                latitude,
                longitude
              )
              if (parseInt(dis) < 10) {
                obj.location = true
              } else {
                obj.location = false
              }
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
                  if (
                    startTime.includes('pm') &&
                    (time === 12 || (time >= 1 && time < 6))
                  ) {
                    obj.times = true
                    // break
                  } else obj.times = false
                }
                // evening filteration
                if (timing.times['evening']) {
                  if (startTime.includes('pm') && time >= 6 && time < 10) {
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

            // console.log(ageRange)

            for (let i = 0; i < ageRange.length; i++) {
              if (age[ageRange[i]]) {
                // console.log(ageRange[i])
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
            // console.log(listing.listingInfo.listingId)
            filteredListings.push(listing)
            return
          }
        }
      })

      // console.log(filteredListings.map(listing => listing.listingInfo.listingId))
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

exports.getSingleCourse = (req, res) => {
  console.log(req.params)
  return db
    .doc(`/courses/${req.params.courseId}`)
    .get()
    .then((data) => {
      const response = data.data()
      console.log(response)
      res.status(201).json(response)
    })
    .catch((error) => console.log(error))
}

exports.addPlayerToList = (req, res) => {
  const companyRef = db.doc(`/users/${req.params.companyId}`)

  const playerInfo = {
    name: req.body.playerName,
    id: req.body.playerId,
    status: req.body.playerStatus,
    dob: req.body.playerDob,
  }

  return companyRef
    .update({
      [`players.${req.body.playerId}`]: playerInfo,
    })
    .then(() => {
      res.status(201).send({ message: 'user added to company player list' })
    })
    .catch((err) => console.log(err))
}

exports.updateRegister = (req, res) => {
  const registerRef = db.doc(`/courses/${req.params.courseId}`)

  return registerRef
    .update({
      register: req.body.updatedRegister,
    })
    .then(() => {
      res.status(201).send({ message: 'register updated!' })
    })

    .catch((err) => console.log(err))
}

exports.updateCourseCoaches = (req, res) => {
  console.log('reqbody', req.body)
  const { companyId, courseId, coaches } = req.body
  const companyCourseRef = db.doc(`/users/${companyId}`)

  db.doc(`/courses/${courseId}`).update({
    coaches: [...coaches],
  })

  return companyCourseRef
    .get()
    .then((data) => {
      console.log('hello', data.data())
      const newCourses = [...data.data().courses.active]
      let updatedCourseId
      let previousCoaches

      for (const course of newCourses) {
        if (course.courseId === courseId) {
          previousCoaches = course.coaches
          course.coaches = coaches
          updatedCourseId = course.courseId
        }
      }

      companyCourseRef
        .update({ 'courses.active': newCourses })
        .then(() => {
          console.log('removed', previousCoaches)

          for (const removedCoach of previousCoaches) {
            db.doc(`/users/${removedCoach}`)
              .get()
              .then((data) => {
                const category = data.data().category

                if (coaches.indexOf(removedCoach) === -1) {
                  category === 'coach'
                    ? db.doc(`/users/${removedCoach}`).update({
                      [`courses.${companyId}.active`]: admin.firestore.FieldValue.arrayRemove(
                        updatedCourseId
                      ),
                    })
                    : db.doc(`/users/${removedCoach}`).update({
                      [`coursesCoaching.${companyId}.active`]: admin.firestore.FieldValue.arrayRemove(
                        updatedCourseId
                      ),
                    })
                }
              })
          }

          for (const addedCoach of coaches) {
            db.doc(`/users/${addedCoach}`)
              .get()
              .then((data) => {
                const userData = data.data()

                userData.category === 'coach'
                  ? db.doc(`/users/${addedCoach}`).update({
                    [`courses.${companyId}.active`]: admin.firestore.FieldValue.arrayUnion(
                      updatedCourseId
                    ),
                  })
                  : db.doc(`/users/${addedCoach}`).update({
                    [`coursesCoaching.${companyId}.active`]: admin.firestore.FieldValue.arrayUnion(
                      updatedCourseId
                    ),
                  })

                sendEmailNotificationCoach(
                  'assignedToRegister',
                  {
                    recipientEmail: userData.email,
                    recipientName: userData.name,
                  },
                  { contentId: updatedCourseId, contentType: 'Courses' }
                )
              })
          }
        })
        .then(() => {
          res.status(201).json({ message: 'coaches updated' })
        })
    })
    .catch((err) => console.log(err))
}

exports.addPlayerToCourse = (req, res) => {
  const courseRef = db.doc(`/courses/${req.params.courseId}`)
  const playerRef = db.doc(`users/${req.body.playerId}`)

  return courseRef
    .update({
      playerList: admin.firestore.FieldValue.arrayUnion(req.body.playerId),
    })
    .then(() => {
      courseRef
        .get()
        .then((data) => {
          const courseData = data.data()
          const { register, courseDetails } = courseData
          const dayNums =
            courseDetails.courseType === 'Camp'
              ? courseDetails.sessions.map((session) =>
                // console.log(session.sessionDate, moment(session.sessionDate.toDate()).day())
                moment(session.sessionDate.toDate()).day()
              )
              : courseDetails.sessions.map((session) =>
                // console.log(session.sessionDate, moment(session.sessionDate.toDate()).day())
                moment().day(session.day).day()
              )
          console.log({ dayNums })
          const newRegister = register
            ? addUsersToRegister(register, [
              {
                name: req.body.playerName,
                id: req.body.playerId,
                dob: req.body.playerDob,
              },
            ])
            : courseDetails.courseType === 'Camp'
              ? createRegister(
                courseDetails.startDate,
                courseDetails.endDate,
                dayNums,
                [
                  {
                    name: req.body.playerName,
                    id: req.body.playerId,
                    dob: req.body.playerDob,
                  },
                ]
              )
              : createRegister(
                courseDetails.startDate,
                courseDetails.endDate,
                dayNums,
                [
                  {
                    name: req.body.playerName,
                    id: req.body.playerId,
                    dob: req.body.playerDob,
                  },
                ]
              )

          courseRef.update({
            register: newRegister,
          })
          return courseData
        })
        .then((data) => {
          const { companyId, courseId } = data
          playerRef.update({
            [`courses.${companyId}.active`]: admin.firestore.FieldValue.arrayUnion(
              courseId
            ),
          })
          db.doc(`/users/${companyId}`)
            .update({
              [`players.${req.body.playerId}.status`]: 'Active',
            })
            .then(() =>
              res.status(201).send({ message: 'player added to course' })
            )
        })
        .catch((err) => console.log(err))
    })
}

exports.createEmptyRegister = (req, res) => {
  const courseRef = db.doc(`/courses/${req.params.courseId}`)

  courseRef
    .get()
    .then((data) => {
      const courseData = data.data()
      const { courseDetails } = courseData
      const dayNums =
        courseDetails.courseType === 'Camp'
          ? courseDetails.sessions.map((session) =>
            moment(session.sessionDate.toDate()).day()
          )
          : courseDetails.sessions.map((session) =>
            moment().day(session.day).day()
          )
      console.log({ dayNums })
      const newRegister =
        courseDetails.courseType === 'Camp'
          ? createRegister(
            courseDetails.startDate,
            courseDetails.endDate,
            dayNums,
            []
          )
          : createRegister(
            courseDetails.startDate,
            courseDetails.endDate,
            dayNums,
            []
          )

      courseData.register = newRegister

      courseRef.update({
        register: newRegister,
      })
      return courseData
    })
    .then((data) => {
      res.status(201).send({ message: 'player added to course', course: data })
    })
    .catch((err) => console.log(err))
}

exports.addSelfToCoaches = (req, res) => {
  const userref = db.doc(`users/${req.body.userId}`)

  return userref
    .update(req.body.updates)
    .then(() => {
      userref.update({
        coaches: admin.firestore.FieldValue.arrayUnion(req.body.userId),
        companies: admin.firestore.FieldValue.arrayUnion(req.body.userId),
      })
    })
    .then(() => {
      userref.get().then(data => {
        req.info = data.data()
        if (
          req.info.coachInfo.dbsCertificate &&
          req.info.coachInfo.coachingCertificate &&
          (!req.info.verificationId || !req.info.verificationId.coachInfo)
        ) {
          console.log('creating')
          createAwaitingVerification(req, res)
        } else if (
          req.info.coachInfo.dbsCertificate &&
          req.info.coachInfo.coachingCertificate &&
          req.info.verificationId.coachInfo !== ''
        ) {
          console.log('updating')
          updateAwaitingVerification(req, res)
        } else {
          return res
            .status(201)
            .json({ message: 'file uploaded', data: req.info })
        }

      })
      res.status(201).send({ message: 'coach details successfully added' })
    })
    .catch((error) => console.log(error))
}

const createRegister = (startDate, endDate, sessionDays, playerList) => {
  const sessions = []
  let date = moment(startDate)
  const endMoment = moment(endDate)

  while (date.isSameOrBefore(endMoment)) {
    console.log(date.day())
    if (sessionDays.some((day) => day === date.day())) {
      // console.log(date.day())
      sessions.push(date.format('YYYY-MM-DD'))
    }
    // console.log(date)
    date = date.add(1, 'days')
  }
  const register = { sessions }

  for (const player of playerList) {
    register[player.id] = { name: player.name, age: player.dob, id: player.id }
    for (const date of sessions) {
      register[player.id][date] = { attendance: false, notes: '' }
    }
  }

  console.log(sessions, register)
  return register
}

const addUsersToRegister = (register, newAdditions) => {
  for (const player of newAdditions) {
    register[player.id] = { name: player.name }
    for (const date of register.sessions) {
      register[player.id][date] = { attendance: false, notes: '' }
    }
  }
  return register
}


exports.sendPlayerRequestEmail = (req, res) => {
  console.log(req.body, req.params)
  const { email, companyName, companyId, type } = req.body
  const code = companyId
  let username = ''
  const target =
    type === 'localhost'
      ? 'http://localhost:3000'
      : 'https://football-hub-4018a.firebaseapp.com'

  const output = `
    <h2 style='text-align:center'> Welcome to Baller Hub from ${companyName}! </h2>
    <p> Hello! </p>
    <p> ${companyName} wants to connect with you on Baller Hub for football training in the future.</p>
    <p> click the link below to create an account with Baller Hub and learn more.</p>
    <a href='${target}/register/player/${code}' target='_blank'>Click here to sign up!</a>
  `
  const valid = validateEmailAddressInput(email)
  if (!valid) return res.status(400).json({ message: 'Invalid email address' })

  db.collection('users')
    .where('email', '==', email)
    .get()
    .then((data) => {
      const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user: 'indulgefootballemail@gmail.com',
          pass: '1ndulgeManchester1',
        },
      })
      const mailOptions = {
        from: 'indulgefootballemail@gmail.com',
        to: email,
        subject: `Welcome to Baller Hub from ${companyName}!`,
        html: output,
      }
      console.log(data.docs.length)

      for (const dataUser of data.docs) {
        console.log('datauser')
        if (dataUser.exists) {
          console.log('exists')
          username = dataUser.data().name
          console.log('username', username)
          mailOptions.html = `
        <h2 style='text-align:center'>Greetings from ${companyName}! </h2>
        <p> Hello ${username}! </p>
        <p> ${companyName} wants to connect with you on Baller Hub for football training in the future.</p>
        <p> click the link below to head to Baller Hub and connect with ${companyName}.</p>
        <a href='${target}/login' target="_blank">Log in and confirm the request!</a>
      `

          mailOptions.to = `${username} <${email}>`
          mailOptions.subject = `Baller Hub connection request from ${companyName}!`


        }
      }
      
      const info = transporter.sendMail(mailOptions)
      res.send({
        message: 'Message sent: %s',
        messageId: info.messageId,
        previewUrl: 'Preview URL: %s',
        preview: nodemailer.getTestMessageUrl(info),
      })
    })
}


exports.sendCoachRequestEmail = (req, res) => {
  console.log(req.body, req.params)
  const { email, companyName, name, companyId, type } = req.body
  const code = companyId
  const target =
    type === 'localhost'
      ? 'http://localhost:3000'
      : 'https://football-hub-4018a.firebaseapp.com'
  const output = `
    <h2 style='text-align:center'> Welcome to Baller Hub from ${companyName}! </h2>
    <p> Hello! ${name} </p>
    <p> ${companyName} wants to connect with you on Baller Hub and become a member of their training team.</p>
    <p> click the link below to create an account with Baller Hub and learn more.</p>
    <a href='${target}/register/trainer/${code}' target='_blank'>Click here to sign up!</a>
  `
  db.collection('users')
    .where('email', '==', email)
    .get()
    .then((data) => {

      console.log('foundUser')

      const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user: 'indulgefootballemail@gmail.com',
          pass: '1ndulgeManchester1',
        },
      })
      const mailOptions = {
        from: 'indulgefootballemail@gmail.com',
        to: `${name} <${email}>`,
        subject: `Welcome to Baller Hub from ${companyName}!`,
        html: output,
      }
      data.forEach((dataUser) => {
        if (dataUser.exists) {
          const userData = dataUser.data()
          const username = userData.name
          const userId = userData.userId
          console.log('username', username)
          mailOptions.html = `
    <h2 style='text-align:center'>Greetings from ${companyName}! </h2>
    <p> Hello ${username}! </p>
    <p> ${companyName} wants to connect with you on Baller Hub for football training in the future.</p>
    <p> click the link below to head to Baller Hub and connect with ${companyName}.</p>
    <a href='${target}/login' target="_blank">Log in and confirm the request!</a>
  `
          mailOptions.to = `${username} <${email}>`
          mailOptions.subject = `Baller Hub connection request from ${companyName}!`
          db.doc(`users/${userId}`)
            .update({
              requests: admin.firestore.FieldValue.arrayUnion(req.body.companyId),
            })
            .then(() => {
              db.doc(`users/${companyId}`).update({
                sentRequests: admin.firestore.FieldValue.arrayUnion(req.body.coachId),
              })
            })
        }
      })

      const info = transporter.sendMail(mailOptions)

      res.send({
        message: 'Message sent: %s',
        messageId: info.messageId,
        previewUrl: 'Preview URL: %s',
        preview: nodemailer.getTestMessageUrl(info),
      })
    })
}







