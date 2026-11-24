import { Router } from 'express'

// a tiny route so I (and Render) can check the server is running
export const healthRouter = Router()

healthRouter.get('/', (_req, res) => {
  res.json({ status: 'ok' })
})
