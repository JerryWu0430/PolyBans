/**
 * routes/analyze.js — One-shot REST fallback.
 *
 * POST /api/analyze
 * Accepts a full transcript chunk, runs the same Mistral → Polymarket
 * pipeline as the WS handler, and returns a single JSON response.
 */

const { Router } = require('express')
const { analyze } = require('../services/mistral')
const { fetchMarkets } = require('../services/polymarket')

const router = Router()

router.post('/', async (req, res) => {
    const { transcript } = req.body

    if (!transcript || typeof transcript !== 'string') {
        return res.status(400).json({ error: 'transcript field is required and must be a string' })
    }

    const trimmed = transcript.trim()
    if (trimmed.length < 100) {
        return res.status(400).json({
            error: 'transcript too short',
            detail: `Received ${trimmed.length} chars, minimum is 100`
        })
    }

    try {
        // 1. Mistral analysis
        const analysis = await analyze(trimmed)

        // 2. Polymarket search
        let markets = []
        if (analysis.detected && analysis.queries && analysis.queries.length > 0) {
            markets = await fetchMarkets(analysis.queries, analysis.tag)
        }

        return res.json({ analysis, markets })
    } catch (err) {
        console.error('[analyze] Pipeline error:', err.message)
        return res.status(500).json({ error: 'Pipeline failed', detail: err.message })
    }
})

module.exports = router
