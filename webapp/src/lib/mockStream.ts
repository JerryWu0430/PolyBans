import type { TranscriptChunk } from "./types/stream";

// Sports commentary samples
const SPORTS_CHUNKS = [
  "And the Lakers take a 10 point lead in the 4th quarter...",
  "LeBron drives to the basket, and it's good! 32 points now for James.",
  "The Chiefs are mounting a comeback, down by just 7 with 2 minutes left.",
  "Mahomes throws deep to Hill... TOUCHDOWN! What a play!",
  "Real Madrid looking dominant in the Champions League tonight.",
  "Mbappe with a brilliant run down the left flank.",
  "The Eagles defense has been incredible, 3 sacks already.",
  "Warriors closing in on another playoff spot with this win.",
  "Curry from downtown... bang! That's his 8th three of the night.",
  "The Dodgers have clinched the NL West title with tonight's victory.",
  "Ohtani at the plate, the count is 2-2...",
  "And it's a home run! His 45th of the season!",
  "Manchester City controlling possession as usual.",
  "Haaland looking for space in the box...",
  "The Celtics are on a 15-0 run to start the quarter.",
];

// Political commentary samples
const POLITICAL_CHUNKS = [
  "The candidate just announced their position on tariffs...",
  "According to the latest polls, the race is tightening in swing states.",
  "The debate tonight could be a turning point for both campaigns.",
  "Pennsylvania remains the most contested battleground state.",
  "New economic data suggests inflation may be cooling.",
  "The Federal Reserve is expected to make a decision next week.",
  "Congressional leaders are meeting to discuss the spending bill.",
  "The president's approval rating sits at 47% according to Gallup.",
  "Trade negotiations with China continue behind closed doors.",
  "Immigration policy remains a key issue for voters in Arizona.",
  "Early voting numbers show record turnout in Georgia.",
  "The Supreme Court will hear arguments on this case next month.",
  "Campaign finance reports show a significant fundraising gap.",
  "The House committee is investigating the matter further.",
  "Election forecasters have updated their predictions...",
];

// Combine both categories
const ALL_CHUNKS = [...SPORTS_CHUNKS, ...POLITICAL_CHUNKS];

/**
 * Generate a random mock transcript chunk
 */
export function generateMockTranscript(): TranscriptChunk {
  const text = ALL_CHUNKS[Math.floor(Math.random() * ALL_CHUNKS.length)];
  return {
    text,
    timestamp: Date.now(),
    speaker: Math.random() > 0.5 ? "Commentator" : undefined,
  };
}

/**
 * Generate a sports-specific transcript chunk
 */
export function generateSportsTranscript(): TranscriptChunk {
  const text = SPORTS_CHUNKS[Math.floor(Math.random() * SPORTS_CHUNKS.length)];
  return {
    text,
    timestamp: Date.now(),
    speaker: "Sports Commentator",
  };
}

/**
 * Generate a political transcript chunk
 */
export function generatePoliticalTranscript(): TranscriptChunk {
  const text =
    POLITICAL_CHUNKS[Math.floor(Math.random() * POLITICAL_CHUNKS.length)];
  return {
    text,
    timestamp: Date.now(),
    speaker: "News Anchor",
  };
}

/**
 * Start a mock stream that generates transcript chunks at intervals
 * @param onChunk - Callback fired for each new chunk
 * @param intervalMs - Interval between chunks (default 2000-3000ms random)
 * @returns Cleanup function to stop the stream
 */
export function startMockStream(
  onChunk: (chunk: TranscriptChunk) => void,
  intervalMs?: number
): () => void {
  let timeoutId: NodeJS.Timeout;
  let isRunning = true;

  const scheduleNext = () => {
    if (!isRunning) return;

    // Random interval between 2-3 seconds if not specified
    const delay = intervalMs ?? 2000 + Math.random() * 1000;

    timeoutId = setTimeout(() => {
      if (!isRunning) return;

      const chunk = generateMockTranscript();
      onChunk(chunk);
      scheduleNext();
    }, delay);
  };

  // Start with an immediate chunk
  onChunk(generateMockTranscript());
  scheduleNext();

  // Return cleanup function
  return () => {
    isRunning = false;
    clearTimeout(timeoutId);
  };
}

/**
 * Start a mock stream focused on a specific category
 */
export function startCategoryStream(
  category: "sports" | "politics" | "mixed",
  onChunk: (chunk: TranscriptChunk) => void
): () => void {
  const generator =
    category === "sports"
      ? generateSportsTranscript
      : category === "politics"
        ? generatePoliticalTranscript
        : generateMockTranscript;

  let timeoutId: NodeJS.Timeout;
  let isRunning = true;

  const scheduleNext = () => {
    if (!isRunning) return;

    const delay = 2000 + Math.random() * 1000;

    timeoutId = setTimeout(() => {
      if (!isRunning) return;
      onChunk(generator());
      scheduleNext();
    }, delay);
  };

  onChunk(generator());
  scheduleNext();

  return () => {
    isRunning = false;
    clearTimeout(timeoutId);
  };
}
