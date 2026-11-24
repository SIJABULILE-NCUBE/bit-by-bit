import { Router } from 'express'
import { requireAuth } from '../middleware/requireAuth.js'
import { requireRole } from '../middleware/requireRole.js'
import { laybyRepo } from '../repositories/laybyRepo.js'
import { dashboardTotals } from '../services/dashboard.js'
import { todayInSA } from '../services/laybyMath.js'
import { summariseLayby } from '../services/laybySummary.js'

// GET /api/dashboard: the owner's totals, worked out from the real database every time
export const dashboardRouter = Router()

dashboardRouter.get('/', requireAuth, requireRole('owner'), async (req, res) => {
  const shop = await laybyRepo.findShopByOwner(req.user!.id)
  const laybys = shop ? await laybyRepo.listLaybys({ shopId: shop.id }) : []
  const today = todayInSA()
  const summaries = laybys.map((l) => summariseLayby(l, today))

  res.json({
    shop,
    totals: dashboardTotals(laybys, today),
    // the lay-bys that need the owner's attention today
    overdueLaybys: summaries.filter((l) => l.overdue),
    readyLaybys: summaries.filter((l) => l.status === 'completed'),
  })
})
