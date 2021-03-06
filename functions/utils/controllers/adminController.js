const { db, admin } = require('../admin')
const { sendEmailNotificationIndulge, verificationEmailer } = require('./notificationController')
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

  // console.log('verify', req.info)
  let undefinedFound = false

  const verificationInfo = req.body.type === 'companyInfo' ? {
    userId: req.info.userId,
    verification: req.info.verification,
    name: req.info.name,
    company_registration_number: req.info.company_registration_number ? req.info.company_registration_number : 'Not Applicable',
    accounts_contact_number: req.info.accounts_contact_number ? req.info.accounts_contact_number : 'N/A',
    accounts_email: req.info.accounts_email ? req.info.accounts_email : 'N/A',
    vat_number: req.info.vat_number ? req.info.vat_number : 'N/A',
    professional_indemnity_insurance: req.info.professional_indemnity_insurance,
    public_liability_insurance: req.info.public_liability_insurance,
    documents: req.info.documents,
    type: req.body.type
  } :
    {
      userId: req.info.userId,
      name: req.info.name,
      coachInfo: req.info.coachInfo,
      verification: req.info.verification,
      message: '',
      type: req.body.type
    }


  for (const value of Object.values(verificationInfo)) {
    if (typeof value === 'undefined') {
      undefinedFound = true
    }
  }

  if (!undefinedFound) {


    return db.collection('/awaitingVerification').add(verificationInfo)
      .then(data => {
        db.doc(`/awaitingVerification/${data.id}`).update({
          verificationId: data.id
        }).then(() => {
          db.doc(`/users/${req.info.userId}`).update({
            [`verificationId.${req.body.type}`]: data.id
          })
        })
      }).then(() => {

        const type = req.body.type === 'companyInfo' ? 'companyDetailsSubmitted' : 'coachDetailsSubmitted'
        return sendEmailNotificationIndulge(type, { indulgeName: 'Indulge Admin', indulgeEmail: 'admin@indulgefootball.com' }, { contentName: req.info.name, contentEmail: req.info.email }).then(email => {
          return res.status(201).json({ message: 'Document successfully uploaded', data: req.info, emailInfo: email })
        })
      })
      // return data
      .catch(error => console.log(error))
  } else {
    return res.status(201).json({ message: 'documents uploaded not enough for verification', data: req.info })
  }
}

exports.updateAwaitingVerification = (req, res) => {

  console.log(req.info.verificationId, req.body.type)

  const verificationInfo = req.body.type === 'companyInfo' ? {
    userId: req.info.userId,
    verification: { ...req.info.verification.companyDetails },
    name: req.info.name,
    company_registration_number: req.info.company_registration_number ? req.info.company_registration_number : 'Not Applicable',
    accounts_contact_number: req.info.accounts_contact_number,
    accounts_email: req.info.accounts_email,
    vat_number: req.info.vat_number ? req.info.vat_number : 'N/A',
    professional_indemnity_insurance: req.info.professional_indemnity_insurance,
    public_liability_insurance: req.info.public_liability_insurance,
    documents: req.info.documents,
    type: req.body.type
  } :
    {
      userId: req.info.userId,
      name: req.info.name,
      coachInfo: req.info.coachInfo,
      verification: req.info.verification,
      message: '',
      type: req.body.type
    }

  // console.log(`/awaitingVerification/${req.info.verificationId[req.body.type]}`)

  db.doc(`/awaitingVerification/${req.info.verificationId[req.body.type]}`).get()
    .then(snapShot => {
      if (snapShot.exists) {
        db.doc(`/awaitingVerification/${req.info.verificationId[req.body.type]}`).update({ ...verificationInfo })
      } else {
        db.doc(`/awaitingVerification/${req.info.verificationId[req.body.type]}`).set({ ...verificationInfo })
      }
    })
    .then(() => {
      console.log('VERIFICATION SENT AND UPDATED')
      res.json({ message: 'document updated!', data: req.info }).status(201)
    })
    .catch(err => res.status(401).send(err))
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
  // console.log(req.body)
  let userEmail
  let userName
  const updatedV = { ...req.body.updatedVerification }
  console.log('updated', updatedV)
  db.collection('awaitingVerification').doc(`${req.body.verificationId}`).delete()
    .then(() => {
      db.doc(`/users/${req.body.userId}`).get().then(data => {
        const userData = data.data()
        const toEmail = req.body.type === 'coachInfo' ? [...userData.companies] : []
        console.log('toEmail', toEmail)
        console.log(userData.companies)
        userEmail = userData.email
        userName = userData.name
        const newV = { ...userData.verification, ...updatedV }
        console.log(newV)
        db.doc(`/users/${req.body.userId}`).update({
          verification: { ...newV },
          [`verificationId.${req.body.type}`]: '',
          message: req.body.message
        })
          .then(() => verificationEmailer(req.body.type, userEmail, userName, updatedV, toEmail))
          .then((emails) => res.status(201).json({ message: 'Documents successfully verified!', emails }))
      })
    })
    .catch(err => res.status(400).json({ error: err }))
}

exports.getAssessment = (req, res) => {
  const { id } = req.params
  console.log({ id })

  db.doc(`/assessments/${id}`)
    .get()
    .then(data => {
      const assessment = data.data()
      console.log({ MESSAGEEE: assessment })
      res.status(201).json(assessment)
    })
    .catch(err => console.error(err))
}

exports.saveAssessmentCompletion = (req, res) => {

  const { userId, assessment_id } = req.body
  const areas = {
    'Technical': {
      'Ball mastery': {
        rating: '',
        rating_selected_feedback: '',
        rating_customised_feedback: '',
        development_selected_actions: '',
        development_customised_actions: ''
      },
      'Receiving the ball': {
        rating: '',
        rating_selected_feedback: '',
        rating_customised_feedback: '',
        development_selected_actions: '',
        development_customised_actions: ''
      },
      'Passing short distance': {
        rating: '',
        rating_selected_feedback: '',
        rating_customised_feedback: '',
        development_selected_actions: '',
        development_customised_actions: ''
      },
      'Passing long distance': {
        rating: '',
        rating_selected_feedback: '',
        rating_customised_feedback: '',
        development_selected_actions: '',
        development_customised_actions: ''
      },
      'First Touch': {
        rating: '',
        rating_selected_feedback: '',
        rating_customised_feedback: '',
        development_selected_actions: '',
        development_customised_actions: ''
      },
      'Running with the ball': {
        rating: '',
        rating_selected_feedback: '',
        rating_customised_feedback: '',
        development_selected_actions: '',
        development_customised_actions: ''
      },
      'Ball striking technique': {
        rating: '',
        rating_selected_feedback: '',
        rating_customised_feedback: '',
        development_selected_actions: '',
        development_customised_actions: ''
      },
      'Finishing': {
        rating: '',
        rating_selected_feedback: '',
        rating_customised_feedback: '',
        development_selected_actions: '',
        development_customised_actions: ''
      },
      '1v1 skills': {
        rating: '',
        rating_selected_feedback: '',
        rating_customised_feedback: '',
        development_selected_actions: '',
        development_customised_actions: ''
      },
      'Dribbling': {
        rating: '',
        rating_selected_feedback: '',
        rating_customised_feedback: '',
        development_selected_actions: '',
        development_customised_actions: ''
      },
      completed_by: ''
    },
    'Tactical': {
      'Vision with the ball': {
        rating: '',
        rating_selected_feedback: '',
        rating_customised_feedback: '',
        development_selected_actions: '',
        development_customised_actions: ''
      },
      'Versatility': {
        rating: '',
        rating_selected_feedback: '',
        rating_customised_feedback: '',
        development_selected_actions: '',
        development_customised_actions: ''
      },
      '1v1 Defending': {
        rating: '',
        rating_selected_feedback: '',
        rating_customised_feedback: '',
        development_selected_actions: '',
        development_customised_actions: ''
      },
      '1v1 Attacking': {
        rating: '',
        rating_selected_feedback: '',
        rating_customised_feedback: '',
        development_selected_actions: '',
        development_customised_actions: ''
      },
      'Decision making in possession': {
        rating: '',
        rating_selected_feedback: '',
        rating_customised_feedback: '',
        development_selected_actions: '',
        development_customised_actions: ''
      },
      'Anticipation': {
        rating: '',
        rating_selected_feedback: '',
        rating_customised_feedback: '',
        development_selected_actions: '',
        development_customised_actions: ''
      },
      'Movement off the ball': {
        rating: '',
        rating_selected_feedback: '',
        rating_customised_feedback: '',
        development_selected_actions: '',
        development_customised_actions: ''
      },
      'Scanning': {
        rating: '',
        rating_selected_feedback: '',
        rating_customised_feedback: '',
        development_selected_actions: '',
        development_customised_actions: ''
      },
      'Positioning': {
        rating: '',
        rating_selected_feedback: '',
        rating_customised_feedback: '',
        development_selected_actions: '',
        development_customised_actions: ''
      },
      'Creativity': {
        rating: '',
        rating_selected_feedback: '',
        rating_customised_feedback: '',
        development_selected_actions: '',
        development_customised_actions: ''
      },
      completed_by: ''
    },
    'Mindset/Performance Mentality': {
      'Emotional intelligence': {
        rating: '',
        rating_selected_feedback: '',
        rating_customised_feedback: '',
        development_selected_actions: '',
        development_customised_actions: ''
      },
      'Composure': {
        rating: '',
        rating_selected_feedback: '',
        rating_customised_feedback: '',
        development_selected_actions: '',
        development_customised_actions: ''
      },
      'Determination': {
        rating: '',
        rating_selected_feedback: '',
        rating_customised_feedback: '',
        development_selected_actions: '',
        development_customised_actions: ''
      },
      'Leadership': {
        rating: '',
        rating_selected_feedback: '',
        rating_customised_feedback: '',
        development_selected_actions: '',
        development_customised_actions: ''
      },
      'Body language': {
        rating: '',
        rating_selected_feedback: '',
        rating_customised_feedback: '',
        development_selected_actions: '',
        development_customised_actions: ''
      },
      'Confidence': {
        rating: '',
        rating_selected_feedback: '',
        rating_customised_feedback: '',
        development_selected_actions: '',
        development_customised_actions: ''
      },
      'Compete Level': {
        rating: '',
        rating_selected_feedback: '',
        rating_customised_feedback: '',
        development_selected_actions: '',
        development_customised_actions: ''
      },
      'Verbal Communication': {
        rating: '',
        rating_selected_feedback: '',
        rating_customised_feedback: '',
        development_selected_actions: '',
        development_customised_actions: ''
      },
      'Attitude': {
        rating: '',
        rating_selected_feedback: '',
        rating_customised_feedback: '',
        development_selected_actions: '',
        development_customised_actions: ''
      },
      'Learning Application': {
        rating: '',
        rating_selected_feedback: '',
        rating_customised_feedback: '',
        development_selected_actions: '',
        development_customised_actions: ''
      },
      completed_by: ''
    },
    'Physical': {
      'Coordination': {
        rating: '',
        rating_selected_feedback: '',
        rating_customised_feedback: '',
        development_selected_actions: '',
        development_customised_actions: ''
      },

      'Stamina': {
        rating: '',
        rating_selected_feedback: '',
        rating_customised_feedback: '',
        development_selected_actions: '',
        development_customised_actions: ''
      },

      'Speed': {
        rating: '',
        rating_selected_feedback: '',
        rating_customised_feedback: '',
        development_selected_actions: '',
        development_customised_actions: ''
      },

      'Power': {
        rating: '',
        rating_selected_feedback: '',
        rating_customised_feedback: '',
        development_selected_actions: '',
        development_customised_actions: ''
      },

      'Agility': {
        rating: '',
        rating_selected_feedback: '',
        rating_customised_feedback: '',
        development_selected_actions: '',
        development_customised_actions: ''
      },

      'Acceleration': {
        rating: '',
        rating_selected_feedback: '',
        rating_customised_feedback: '',
        development_selected_actions: '',
        development_customised_actions: ''
      },

      'Work Rate': {
        rating: '',
        rating_selected_feedback: '',
        rating_customised_feedback: '',
        development_selected_actions: '',
        development_customised_actions: ''
      },

      'Resilience': {
        rating: '',
        rating_selected_feedback: '',
        rating_customised_feedback: '',
        development_selected_actions: '',
        development_customised_actions: ''
      },

      'Balance': {
        rating: '',
        rating_selected_feedback: '',
        rating_customised_feedback: '',
        development_selected_actions: '',
        development_customised_actions: ''
      },

      'Strength': {
        rating: '',
        rating_selected_feedback: '',
        rating_customised_feedback: '',
        development_selected_actions: '',
        development_customised_actions: ''
      },
      completed_by: ''
    }
  }


  db.doc(`/users/${userId}`).get().then(data => {
    const user = data.data()
    const { ajax_application } = user.applications

    if (ajax_application.hasOwnProperty('assessment_id')) {
      console.log('EXISTINGGGG ASSESSMENTTT')

      db.doc(`/assessments/${ajax_application.assessment_id}`)
        .update(req.body)
        .then(() =>
          res.status(200).json({ message: 'successfully updated' })
        )
        .catch((err) => res.status(400).json(err))

      return
    }

    console.log('NOTT EXISTINGGGG ASSESSMENTTT')
    db.collection('/assessments').add({
      ...req.body,
      areas: {
        ...areas,
        [Object.keys(req.body.areas)[0]]: {
          ...areas[Object.keys(req.body.areas)[0]],
          ...req.body.areas[Object.keys(req.body.areas)[0]]
        }
      }
    })
      .then(data => {
        db.doc(`/users/${userId}`).update({
          applications: {
            ajax_application: {
              ...ajax_application,
              assessment_id: data.id
            }
          }
        })
        res.status(200).json({ message: 'successful upload' })
      })
      .catch((err) => res.status(400).json(err))
  })
}