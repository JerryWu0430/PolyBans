/**
 * ws/stream.js — WebSocket handler for live transcript streaming.
 *
 * Each WS connection representing one live session (e.g. one person
 * at a football game). Client streams transcript chunks; server buffers,
 * analyses with Mistral, and pushes market results back.
 */

const { TranscriptBuffer } = require('../services/buffer')
const { analyze } = require('../services/mistral')
const { fetchMarkets } = require('../services/polymarket')

/**
 * Attach a WebSocket upgrade handler to an existing HTTP server.
 * Handles the path /api/stream.
 *
 * @param {import('http').Server} httpServer
 * @param {import('ws').WebSocketServer} wss
 */
function attachStreamHandler(wss) {
    wss.on('connection', (ws, req) => {
        const sessionId = Math.random().toString(36).slice(2, 10)
        console.log(`[ws] Session ${sessionId} connected`)

        const buffer = new TranscriptBuffer()

        function send(obj) {
            if (ws.readyState === ws.OPEN) {
                ws.send(JSON.stringify(obj))
            }
        }

        async function runPipeline(text) {
            buffer.isProcessing = true
            try {
                // 1. Mistral analysis
                console.log(`[ws:${sessionId}] Analysing ${text.length} chars with Mistral...`)
                const analysis = await analyze(text)
                send({ type: 'analysis', data: analysis })

                // 2. Polymarket search (only if a market was detected)
                if (analysis.detected && analysis.queries && analysis.queries.length > 0) {
                    console.log(`[ws:${sessionId}] Fetching markets for queries: ${analysis.queries.join(', ')}`)
                    const markets = await fetchMarkets(analysis.queries, analysis.tag)
                    send({
                        type: 'markets',
                        data: {
                            reason: analysis.reason,
                            queries: analysis.queries,
                            markets
                        }
                    })
                    console.log(`[ws:${sessionId}] Pushed ${markets.length} markets`)
                }
            } catch (err) {
                console.error(`[ws:${sessionId}] Pipeline error:`, err.message)
                send({ type: 'error', message: err.message })
            } finally {
                buffer.isProcessing = false
            }
        }

        ws.on('message', (raw) => {
            let msg
            try {
                msg = JSON.parse(raw)
            } catch {
                send({ type: 'error', message: 'Invalid JSON' })
                return
            }

            if (msg.type === 'transcript' && typeof msg.text === 'string') {
                const { ready, charsBuffered } = buffer.append(msg.text)

                // Always send buffering progress
                send({ type: 'buffering', chars: charsBuffered, threshold: buffer.threshold })

                if (ready) {
                    const text = buffer.flush()
                    runPipeline(text)
                }
            } else if (msg.type === 'stop') {
                buffer.reset()
                send({ type: 'stopped' })
                console.log(`[ws:${sessionId}] Session stopped by client`)
            } else {
                send({ type: 'error', message: `Unknown message type: ${msg.type}` })
            }
        })

        ws.on('close', () => {
            buffer.reset()
            console.log(`[ws] Session ${sessionId} disconnected`)
        })

        ws.on('error', (err) => {
            console.error(`[ws:${sessionId}] Socket error:`, err.message)
            buffer.reset()
        })
    })
}

module.exports = { attachStreamHandler }
