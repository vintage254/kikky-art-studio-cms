import express from 'express'
import path from 'path'
import payload from 'payload'
import { config as dotenvConfig } from 'dotenv'

// Load environment variables
dotenvConfig()

// Create Express app
const app = express()
const PORT = parseInt(process.env.PORT || '3000', 10)

// Health check endpoint for Render
app.get('/health', (_, res) => {
  res.status(200).send('OK')
})

// Serve media files
app.use('/media', express.static(path.resolve(__dirname, '../media')))

// Track consecutive database errors
let consecutiveDbErrors = 0
const MAX_DB_ERRORS = 5

// Handle uncaught exceptions to prevent crashes due to database disconnections
process.on('uncaughtException', (error: any) => {
  const errorString = String(error)
  
  // Check for database termination messages
  if (
    errorString.includes('db_termination') || 
    errorString.includes('Connection terminated') ||
    errorString.includes(':shutdown') ||
    (error.code === 'XX000' && error.severity === 'FATAL')
  ) {
    console.log('==== DATABASE CONNECTION TERMINATED ====')
    console.log('Database connection was terminated. This is expected behavior with serverless databases.')
    
    // Keep track of consecutive errors for potential recovery
    consecutiveDbErrors++
    
    if (consecutiveDbErrors >= MAX_DB_ERRORS) {
      console.log(`Detected ${consecutiveDbErrors} consecutive database errors. Attempting recovery...`)
      setTimeout(() => {
        console.log('Recovery delay completed. Operations will resume on next request.')
        consecutiveDbErrors = 0
      }, 5000)
    }
    
    return // Prevent the process from exiting
  }
  
  // For other uncaught exceptions, log and potentially exit
  console.error('Uncaught Exception:', error)
})

// Initialize Payload
const start = async () => {
  // Initialize Payload
  await payload.init({
    secret: process.env.PAYLOAD_SECRET || '',
    express: app,
    onInit: async () => {
      payload.logger.info(`Payload Admin URL: ${payload.getAdminURL()}`)
      // Reset error counter on successful initialization
      consecutiveDbErrors = 0
    },
  })

  // Setup a database keep-alive to prevent database from suspending
  const KEEP_ALIVE_INTERVAL = 4 * 60 * 1000 // 4 minutes
  setInterval(async () => {
    try {
      // Use a simple collection count operation to ping the database
      await payload.find({
        collection: 'users',
        limit: 1,
        depth: 0 // Don't populate relations to keep it lightweight
      })
      
      if (process.env.NODE_ENV !== 'production') {
        payload.logger.info('Database keep-alive ping successful')
      }
    } catch (error) {
      payload.logger.error('Database keep-alive ping failed:', error)
    }
  }, KEEP_ALIVE_INTERVAL)

  // Redirect root to Admin panel
  app.get('/', (_, res) => {
    res.redirect('/admin')
  })

  // Start server
  app.listen(PORT, '0.0.0.0', () => {
    payload.logger.info(`Server running on http://0.0.0.0:${PORT}`)
  })
}

start()
