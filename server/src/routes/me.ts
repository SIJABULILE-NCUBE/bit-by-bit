import { Router } from 'express'
import { requireAuth } from '../middleware/requireAuth.js'

// GET /api/me: who am I? (any logged-in user)
// my client uses this to show the user's name and send them to the right dashboard
export const meRouter = Router()

meRouter.get('/', requireAuth, (req, res) => {
  res.json(req.user)
})
