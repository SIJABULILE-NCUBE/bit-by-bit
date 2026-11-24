import express, { type ErrorRequestHandler } from 'express'
import cors from 'cors'
import { corsOptions } from './lib/cors.js'
import { healthRouter } from './routes/health.js'
import { meRouter } from './routes/me.js'

// I build the app in a function so my tests can make a fresh one each time
// (index.ts is the only place that actually starts listening)
export function createApp() {
  const app = express()

  // only my React app (CLIENT_URL) is allowed to call this API from the browser
  app.use(cors(corsOptions()))
  app.use(express.json())

  app.use('/api/health', healthRouter)
  app.use('/api/me', meRouter)

  // anything I haven't made a route for
  app.use((_req, res) => {
    res.status(404).json({ error: 'Not found' })
  })

  // if something crashes, I log it and send a plain message (never the details)
  const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
    console.error(err)
    res.status(500).json({ error: 'Something went wrong' })
  }
  app.use(errorHandler)

  return app
}
