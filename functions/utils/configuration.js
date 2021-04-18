// Firebase library used to have access to authentication function
// const { functions } = require('../admin')
const functions = require('firebase-functions')

const { api_key, auth_domain, database_url, project_id, storage_bucket, messaging_sender_id, app_id, measurement_id } = functions.config().config_params

module.exports = {
  apiKey: api_key,
  authDomain: auth_domain,
  databaseURL: database_url,
  projectId: project_id,
  storageBucket: storage_bucket,
  messagingSenderId: messaging_sender_id,
  appId: app_id,
  measurementId: measurement_id
}