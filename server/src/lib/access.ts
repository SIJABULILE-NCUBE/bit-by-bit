import { laybyRepo, type LaybyRecord } from '../repositories/laybyRepo.js'
import type { AuthUser } from '../types.js'

// loads a lay-by, but only if this user is allowed to see it:
// customers see their own, owners see their own shop's
// anyone else gets null, and my routes turn that into a 404
// (so people can't even tell whether someone else's lay-by exists)
export async function findLaybyFor(user: AuthUser, laybyId: string): Promise<LaybyRecord | null> {
  const layby = await laybyRepo.getLayby(laybyId)
  if (!layby) return null

  if (user.role === 'customer') {
    return layby.customerId === user.id ? layby : null
  }

  const shop = await laybyRepo.findShopByOwner(user.id)
  return shop && layby.shopId === shop.id ? layby : null
}
