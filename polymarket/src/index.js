/**
 * src/index.js — Express + WebSocket server entrypoint.
 *
 * - REST: POST /api/analyze (one-shot)
 * - WS:   /api/stream       (live streaming)
 * - GET   /health
 */

require('dotenv').config()

const http = require('http')
const express = require('express')
const cors = require('cors')
const { WebSocketServer } = require('ws')

const analyzeRouter = require('./routes/analyze')
const { attachStreamHandler } = require('./ws/stream')

if (!process.env.MISTRAL_API_KEY) {
    console.error('❌  MISTRAL_API_KEY is not set. Copy .env.example → .env and add your key.')
    process.exit(1)
}

const PORT = process.env.PORT || 3001

const app = express()

app.use(cors())
app.use(express.json())

// Health check
app.get('/health', (_req, res) => res.json({ status: 'ok' }))

// One-shot REST endpoint
app.use('/api/analyze', analyzeRouter)

// Generic error handler
app.use((err, _req, res, _next) => {
    console.error('[express] Unhandled error:', err)
    res.status(500).json({ error: 'Internal server error' })
})

// --- HTTP + WebSocket Server ---
const httpServer = http.createServer(app)

const wss = new WebSocketServer({
    server: httpServer,
    path: '/api/stream'
})

attachStreamHandler(wss)

httpServer.listen(PORT, () => {
    console.log(`✅  Polymarket API running`)
    console.log(`   REST  → http://localhost:${PORT}/api/analyze`)
    console.log(`   WS    → ws://localhost:${PORT}/api/stream`)
    console.log(`   Health → http://localhost:${PORT}/health`)
})
