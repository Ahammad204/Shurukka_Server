const dotenv = require('dotenv')
const app = require('./src/app')
const connectDB = require('./src/config/db')

dotenv.config()

let cachedConnection = global.__localguard_db

async function ensureDatabaseConnection() {
  if (cachedConnection) {
    return cachedConnection
  }

  cachedConnection = connectDB()
  global.__localguard_db = cachedConnection
  return cachedConnection
}

module.exports = async (req, res) => {
  try {
    await ensureDatabaseConnection()
    return app(req, res)
  } catch (error) {
    console.error('Vercel server error:', error)
    res.statusCode = 500
    res.end('Internal server error')
  }
}
