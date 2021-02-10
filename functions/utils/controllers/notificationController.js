/* eslint-disable comma-dangle */
// const { report } = require('process')
const { db, admin } = require('../admin')
const config = require('../configuration')
const moment = require('moment')
// const {
//   createAwaitingVerification,
//   updateAwaitingVerification,
// } = require('./adminController')
// const firebase = require('firebase/app')
const nodemailer = require('nodemailer')
// require('firebase/firestore')
const adminURL = 'https://football-hub-4018a.firebaseapp.com/adminbeta'
const loginURL = 'https://football-hub-4018a.firebaseapp.com/login'
const linkMaker = (url, innertext) => {
  return `<a href='${url}' target='_blank' rel='noreferrer noreopener'>${innertext}</a>`
}

exports.sendEmailNotificationIndulge = function (
  type,
  recipient,
  emailContent
) {
  const { indulgeName, indulgeEmail } = recipient
  const { contentName, contentEmail } = emailContent

  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: 'indulgefootballemail@gmail.com',
      pass: '1ndulgeManchester1',
    },
  })

  let typeHeader
  let typeContent

  switch (type) {
    case 'newCompany':
      typeHeader = 'New Company has joined ftballer.com'
      typeContent =
        'A new company has signed up with ftballer.com, you can check their information on the admin panel.\n Nothing further is required at this point'
      break
    // adminController.js 66
    case 'companyDetailsSubmitted':
      typeHeader = 'A company has submitted documents for verification'
      typeContent =
        'Please login to the admin panel and approve or deny the submitted documents and details.'
      break
    // adminController.js 66
    case 'coachDetailsSubmitted':
      typeHeader = 'A coach has submitted documents for verification'
      typeContent =
        'Please login to the admin panel and approve or deny the submitted documents and details.'
      break
    case 'newMembershipPayments':
      typeHeader = 'A new membership payment has been made'
      typeContent = ''
      break
    case 'overduePayments':
      typeHeader = 'A company is overdue with their payments'
      typeContent = ''
      break
    //Done elsewhere EnquiryController
    case 'newEnquiries':
      typeHeader = 'FTBaller has a new enquiry'
      typeContent = ''
      break
  }

  const mailOptions = {
    from: 'indulgefootballemail@gmail.com',
    to: `${indulgeName} <${indulgeEmail}>`,
    subject: `Notification: ${typeHeader} ${contentName}`,
    html: `
  <h2 style='text-align:center'></h2>
  <p> Hello ${indulgeName}, </p>
  <p>${typeContent}</p>
  <a href=${adminURL} target='_blank' rel='noreferrer noreopener'>Login to the admin panel here</a>
  <br>
  <p>Indulge Football</p>
`,
  }

  return transporter.sendMail(mailOptions)
}

exports.sendEmailNotificationCompany = async function (
  type,
  recipient,
  emailContent
) {
  console.log('emailing company!')

  if (recipient.recipientId) {
    let res = await db.doc(`/users/${recipient.recipientId}`).get()
    res = res.data()
    recipient.companyName = res.name
    recipient.companyEmail = res.email
  }

  if (emailContent.emailId) {
    let res = await db.doc(`/users/${emailContent.emailId}`).get()
    res = res.data()
    emailContent.contentName = res.name
    emailContent.contentEmail = res.email
  }

  const { companyName, companyEmail } = recipient
  const { contentName, contentEmail, contentCourse } = emailContent

  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: 'indulgefootballemail@gmail.com',
      pass: '1ndulgeManchester1',
    },
  })

  let typeHeader
  let typeContent

  switch (type) {
    case 'newCoursePayment':
      typeHeader = 'New payment for a course/camp from'
      typeContent = `A new payment has been made from one of your players.\n${contentName} has booked onto ${contentCourse}`
      break
    case 'paymentsdue':
      typeHeader = '?'
      typeContent = '?'
      break
    //paymentController 234
    case 'newPlayerCourseSignUp':
      typeHeader = 'A Player has been registered onto your course'
      typeContent = `${contentName} has been placed on the register for ${contentCourse}`
      break
    case 'newEnquiries':
      typeHeader = 'You have a new enquiry'
      typeContent = ''
      break
    case 'newBookings':
      typeHeader = ''
      typeContent = ''
      break
    case 'coachAcceptInvite':
      typeHeader = 'Your coaching invitation was accepted by'
      typeContent = `${contentName} has accepted your invitation to join your team.\n We will verify their details and update you when confirmed.`
      break
    case 'coachSetUp':
      typeHeader = 'A new coach on your team'
      typeContent = `${contentName} has verified their coaching account and can now be assigned to your courses and listings.`
      break
    case 'accountSetUpConfirmation':
      typeHeader = 'You have finished setting up your account'
      typeContent =
        'Congratulations you have finished setting up your account.\n You can now publish your listings.'
      break
    case 'indulgePaymentConfirmation':
      typeHeader = '?'
      typeContent = '?'
      break
  }

  const mailOptions = {
    from: 'indulgefootballemail@gmail.com',
    to: `${companyName} <${companyEmail}>`,
    subject: `Notification: ${typeHeader} ${contentName}`,
    html: `
  <h2 style='text-align:center'></h2>
  <p> Hello ${companyName}, </p>
  <p>${typeContent}</p>
  <a href=${loginURL} target='_blank' rel='noreferrer noreopener' >Please login to see more details</a>
  <br>
  <p>Indulge Football</p>
`,
  }

  transporter.sendMail(mailOptions, (err, info) => {
    if (err) {
      return err
    }
    return info
  })
}

exports.sendEmailNotificationCoach = async function (
  type,
  recipient,
  emailContent
) {
  console.log('emailing coach')

  if (emailContent.contentId) {
    const { contentType, contentId } = emailContent
    let res = (await db.doc(`/${contentType}/${contentId}`).get()).data()
    emailContent.contentCourse = res.optionalName
  }

  const { coachName, coachEmail } = recipient
  const { contentName, contentEmail, contentCourse } = emailContent

  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: 'indulgefootballemail@gmail.com',
      pass: '1ndulgeManchester1',
    },
  })

  let typeHeader
  let typeContent

  switch (type) {
    //companyController 1165
    case 'assignedToRegister':
      typeHeader = 'You have been assigned to a course'
      typeContent = `One of your coaching companies has assigned you to a new course: ${contentCourse}`
      break
    case 'companyRequestExisting':
      typeHeader = `You have recieved a coaching request from ${contentName}`
      typeContent = 'Please login to your account and respond to this request.'
      break
    case 'accountSetUpConfirmation':
      typeHeader = 'You have finished setting up your account'
      typeContent =
        'Congratulations you have finished setting up and verifying your account.\n You can now be assigned to courses by your coaching companies.'
      break
    case 'registerReminder':
      typeHeader = 'One of your registers is unfinished'
      typeContent = `This is a reminder to complete the register for course ${contentCourse}.`
      break
  }

  const mailOptions = {
    from: 'indulgefootballemail@gmail.com',
    to: `${coachName} <${coachEmail}>`,
    subject: `Notification: ${typeHeader}`,
    html: `
  <h2 style='text-align:center'></h2>
  <p> Hello ${coachName}, </p>
  <p>${typeContent}</p>
  <a href=${loginURL} target='_blank' rel='noreferrer noreopener'>Please login to see more details</a>
  <br>
  <p>Indulge Football</p>
`,
  }

  transporter.sendMail(mailOptions, (err, info) => {
    if (err) {
      return err
    }
    return info
  })
}

exports.sendEmailNotificationPlayer = async function (
  type,
  recipient,
  emailContent
) {
  console.log('emailing player!')

  if (recipient.recipientId) {
    let res = await db.doc(`/users/${recipient.recipientId}`).get()
    res = res.data()
    recipient.playerName = res.name
    recipient.contactEmail = res.email
  }

  if (emailContent.emailId) {
    let res = await db.doc(`/users/${recipient.company}`).get()
    res = res.data()
    emailContent.contentName = res.name
    emailContent.contentEmail = res.email
  }

  const { playerName, parentName, contactEmail } = recipient
  const { contentName, contentEmail, contentCourse } = emailContent

  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: 'indulgefootballemail@gmail.com',
      pass: '1ndulgeManchester1',
    },
  })

  let typeHeader
  let typeContent

  switch (type) {
    case 'paymentConfirmation':
      typeHeader = ''
      typeContent = ''
      break
    case 'bookingConfirmation':
      typeHeader = 'You\'re booked onto a new course'
      typeContent = `You have been booked onto ${contentName}'s course ${contentCourse}.`
      break
    case 'accountVerification':
      typeHeader = 'You have finished setting up your account'
      typeContent = ''
      break
    case 'accountSetUp':
      typeHeader = ''
      typeContent = ''
      break
    case 'overduePayment':
      typeHeader = '?'
      typeContent = '?'
      break
  }

  const mailOptions = {
    from: 'indulgefootballemail@gmail.com',
    to: `${parentName ? parentName : playerName} <${contactEmail}>`,
    subject: `FTBaller Notification: ${typeHeader}`,
    html: `
  <h2 style='text-align:center'></h2>
  <p> Hello ${parentName ? parentName : playerName}, </p>
  <p>${typeContent}</p>
  <a href=${loginURL} target='_blank' rel='noreferrer noreopener'>Please login to see more details</a>
  <br>
  <p>Indulge Football</p>
`,
  }

  transporter.sendMail(mailOptions, (err, info) => {
    if (err) {
      console.log(err)
      return err
    }
    return info
  })
}

exports.verificationEmailer = function (
  type,
  userEmail,
  userName,
  verification,
  toEmail = []
) {


  console.log('toEmailGeneric', toEmail)


  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: 'indulgefootballemail@gmail.com',
      pass: '1ndulgeManchester1',
    },
  })

  if (type === 'coachInfo') {
    const stillNeed = []

    if (Object.values(verification).reduce((pre, curr) => pre && curr, true)) {
      console.log('all good!')
    } else {
      if (verification.coachCertificateCheck) {
        stillNeed.push('Coach Certification')
      }
      if (verification.dbsCertificateCheck) {
        stillNeed.push('DBS Certification')
      }
    }

    const coachEmailContent = [
      '<h2 style=\'text-align:center\'></h2>',
      `<p> Hello ${userName}, </p>`,
      ... stillNeed.length === 0 ? '<p>Good news! We have verified all your submitted documents and you don\'t need to provide anything further at this point.</p>' : '<p>Unfortunately we couldn\'t verify all of your documentation. Please see below the rejected documents.</p>',
      ... stillNeed.length > 0 ? `<p>Documents that require attention</p><li>${stillNeed.map((item) => '<ul>' + item + '/ul>').join('')}</li>` : [],
      '<br>',
      `<a href=${loginURL} target='_blank' rel='noreferrer noreopener'>Please login to see more details</a>`,
      '<br>',
      '<p>Indulge Football</p>'
    ]

    const coachMailOptions = {
      from: 'indulgefootballemail@gmail.com',
      to: `${userName} <${userEmail}>`,
      subject: 'FTBaller Notification: Document verification update',
      html: coachEmailContent.join('')
    }

    const promises = []
    toEmail.forEach((id) => {
      promises.push(db.doc(`/users/${id}`).get())
    })

    return Promise.all(promises).then((promises) => {
      const companyInfoArray = promises.map((company) => {
        const container = {}
        container.email = company.data().email
        container.name = company.data().name

        return container
      })
      const emailPromises = []

      companyInfoArray.forEach((company) => {
        const emailContent = [
          '<h2 style=\'text-align:center\'></h2>',
          `<p> Hello ${company.name} </p>`,
          ... stillNeed.length === 0
            ? `<p>Good news! We have verified all your coach ${userName}'s submitted documents. You can now include then on your live listings.</p>`
            : `<p>Unfortunately we couldn't verify all of your coach ${userName}'s documentation. Please see below the rejected documents.</p>`,
          ... stillNeed.length > 0
            ? `<p>Documents that require attention</p><li>${stillNeed.map((item) => '<ul>' + item + '</ul>').join('')}</li>`
            : [],
          '<br>',
          `<p>We have informed the coach that there are ${
            stillNeed.length === 0
              ? 'no actions to take.'
              : 'actions to take and need to resolve them.'
          }</p>`,
          '<p>You do not need to do anything further at this point</p>',
          `<a href=${loginURL} target='_blank' rel='noreferrer noreopener' >Please login to see more details</a>`,
          '<br>',
          '<p>Indulge Football</p>',
        ]
        const companyMailOptions = {
          from: 'indulgefootballemail@gmail.com',
          to: `${company.name} <${company.email}>`,
          subject: `FTBaller Notification: Document verification update for your coach ${userName}`,
          html: emailContent.join(''),
        }

        emailPromises.push(transporter.sendMail(companyMailOptions))
        
      })

      emailPromises.push(transporter.sendMail(coachMailOptions))

      Promise.all(emailPromises).then(() => {
        console.log(emailPromises)
        return emailPromises
      })
    })
  } else {
    console.log('do this')
  }
}
