const { db, admin } = require('./admin')

// Authentication middleware
// Checks that the user bears a token and that they have the right of access for an endpoint
// OAuth 2.0 is a protocol that allows a user to grant a third-party web site or application access to the user's protected resources
module.exports = (req, res, next) => {
  // console.log('middleware req')

  const authToken = req.headers.authorization
  // console.log(authToken)

  if (!authToken || !authToken.startsWith('Bearer')) {
    return res.status(401).json({ message: 'Unauthorized, no token' })
  }

  const token = authToken.replace('Bearer ', '')
  // console.log(token)

  admin
    .auth()
    .verifyIdToken(token)
    // Promise returns a decoded version of the auth token
    // decodedToken contains user information we need to extract to pass onto the cloud function by appending to req.body
    .then(decodedToken => {
      req.user = decodedToken.user_id
      return next()
    })
    .catch((err) => {
      console.log(err)
      res.status(500).json({ error: 'Error verifying token' })
    })

}