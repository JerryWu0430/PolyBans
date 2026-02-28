/**
 * polymarket.js — Polymarket API client.
 *
 * Ports fetchPolymarketMarkets() and getSparklineData() from PolyWhisper's
 * background.ts, adapted for a Node.js environment.
 */

const GAMMA_API = 'https://gamma-api.polymarket.com'
const CLOB_API = 'https://clob.polymarket.com'

/**
 * Fetch price history (sparkline) for a CLOB token.
 * @param {string} clobTokenId
 * @returns {Promise<number[]>}
 */
async function getSparkline(clobTokenId) {
    if (!clobTokenId) return []
    try {
        const res = await fetch(`${CLOB_API}/prices-history?interval=max&market=${clobTokenId}`)
        if (!res.ok) return []
        const data = await res.json()
        if (data && data.history) {
            return data.history.map((h) => h.p)
        }
        return []
    } catch {
        return []
    }
}

/**
 * Search Polymarket for active events matching a query.
 * Returns up to 3 enriched market objects per query.
 *
 * @param {string} query
 * @param {string|null} [tag]
 * @returns {Promise<Array>}
 */
async function searchMarkets(query, tag) {
    try {
        let url = `${GAMMA_API}/public-search?q=${encodeURIComponent(query)}&events_status=active&limit_per_type=20`
        if (tag && tag.toLowerCase() !== 'null') {
            url += `&events_tag=${encodeURIComponent(tag.toLowerCase())}`
        }

        const res = await fetch(url)
        if (!res.ok) return []
        const data = await res.json()

        if (!data || !data.events || data.events.length === 0) return []

        const topEvents = data.events.slice(0, 3)
        const results = []

        for (const event of topEvents) {
            let sparkline = []
            try {
                if (event.markets && event.markets[0] && event.markets[0].clobTokenIds) {
                    const raw = event.markets[0].clobTokenIds
                    const tokens = typeof raw === 'string' ? JSON.parse(raw) : raw
                    if (Array.isArray(tokens) && tokens.length > 0) {
                        sparkline = await getSparkline(tokens[0])
                    }
                }
            } catch {
                // Sparkline failure is non-fatal
            }

            results.push({
                id: event.id,
                slug: event.slug,
                title: event.title,
                question: event.question || event.title,
                volume: event.volume,
                markets: event.markets ? event.markets.slice(0, 2) : [],
                sparkline,
                image: event.image || null
            })
        }

        return results
    } catch (err) {
        console.error('[polymarket] searchMarkets error:', err.message)
        return []
    }
}

/**
 * Run parallel searches for all queries, deduplicate by event ID,
 * filter zero-volume markets, sort by volume desc, cap at 4.
 *
 * @param {string[]} queries
 * @param {string|null} [tag]
 * @returns {Promise<Array>}
 */
async function fetchMarkets(queries, tag) {
    const allResults = await Promise.all(queries.map((q) => searchMarkets(q, tag)))

    const seen = new Set()
    const markets = []

    for (const batch of allResults) {
        for (const m of batch) {
            if (!seen.has(m.id) && Number(m.volume) > 0) {
                seen.add(m.id)
                markets.push(m)
            }
        }
    }

    markets.sort((a, b) => (Number(b.volume) || 0) - (Number(a.volume) || 0))
    return markets.slice(0, 4)
}

module.exports = { fetchMarkets, searchMarkets, getSparkline }
