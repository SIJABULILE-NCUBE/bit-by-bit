import 'dotenv/config'
import { createApp } from './app.js'

// this file just starts the server (my .env values are loaded above)
const port = Number(process.env.PORT) || 4000

createApp().listen(port, () => {
  console.log(`Bit by Bit API running on http://localhost:${port}`)
})
