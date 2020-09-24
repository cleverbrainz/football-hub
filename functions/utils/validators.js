// Checks if an email is valid
const isValidEmail = string => {
  const emailRegEx = /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/
  return emailRegEx.test(string)
}

// Checks if a string is empty 
const isEmpty = string => {
  if (string.trim() === '') return true
  else return false
}

// Checks if name is valid - tests for white space and above 5 characters
const isValidName = string => {
  return /\s/g.test(string) && string.length > 5
}

// Checks if password provided is valid
// 1 num, 1 Lcase letter, 1 Ucase letter, more than 8 char
const isValidPassword = string => {
  const passwordRegEx = /(?=.*\d)(?=.*[a-z])(?=.*[A-Z]).{8,}/
  return passwordRegEx.test(string)
}


exports.validateSignupFields = data => {

  const { fullName, email, password, confirmPassword } = data
  console.log(data)
  const fieldErrors = {}

  if (isEmpty(fullName) || !isValidName(fullName)) fieldErrors.fullName = 'Please give us your full name'
  if (isEmpty(email) || !isValidEmail(email)) fieldErrors.email = 'Must be a valid email address'
  if (!isValidPassword(password)) fieldErrors.password = 'Must be a valid password'
  if (password !== confirmPassword) fieldErrors.confirmPassword = 'Passwords must match'
  // if (isEmpty(category)) fieldErrors.category = 'Tell us who you are'

  return {
    error: fieldErrors,
    valid: Object.keys(fieldErrors).length === 0 ? true : false
  }
}


exports.validateLoginFields = data => {
  let fieldErrors = 0
  Object.keys(data).map(key => isEmpty(data[key]) ? fieldErrors++ : null)
  return { valid: fieldErrors === 0 ? true : false }
}  
