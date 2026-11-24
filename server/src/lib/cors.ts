import type { CorsOptions } from 'cors'

// which websites may call my API from a browser
// CLIENT_URL can be one site or a comma-separated list, e.g.
//   CLIENT_URL=https://bit-by-bit.vercel.app,http://localhost:5173
// I strip trailing slashes, because browsers send the origin without one
export function allowedOrigins(clientUrl = process.env.CLIENT_URL): string[] {
  return (clientUrl ?? 'http://localhost:5173')
    .split(',')
    .map((url) => url.trim().replace(/\/+$/, ''))
    .filter(Boolean)
}

export function corsOptions(): CorsOptions {
  // cors only sends the "allowed" header back when the origin is in this list
  return { origin: allowedOrigins() }
}
