/**
 * cleanText — strip any model-specific render/citation artefacts
 * from LLM output strings before returning to the client.
 */

// Matches tags like <grok:render ...>...</grok:render>
const RENDER_TAG_RE = /<[a-z]+:[a-z]+[^>]*>.*?<\/[a-z]+:[a-z]+>/gs

/**
 * @param {string} text
 * @returns {string}
 */
function cleanText(text) {
    if (!text) return ''
    return text.replace(RENDER_TAG_RE, '').trim()
}

module.exports = { cleanText }
