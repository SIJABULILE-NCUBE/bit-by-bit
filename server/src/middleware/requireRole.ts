import type { RequestHandler } from 'express'
import type { Role } from '../types.js'

// use AFTER requireAuth, e.g. router.post('/', requireAuth, requireRole('owner'), handler)
// logged in but the wrong kind of user? that's a 403
export function requireRole(...allowed: Role[]): RequestHandler {
  return (req, res, next) => {
    if (!req.user) {
      res.status(401).json({ error: 'Please log in' })
      return
    }
    if (!allowed.includes(req.user.role)) {
      res.status(403).json({ error: "You don't have access to this" })
      return
    }
    next()
  }
}
