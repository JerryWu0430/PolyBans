import { create } from "zustand";
import type { TranscriptChunk } from "../types/stream";
import type { AnalysisResult } from "../types/analysis";

type StreamMode = "raybans" | "weblive" | null;

interface StreamState {
  mode: StreamMode;
  transcript: TranscriptChunk[];
  isConnected: boolean;
  currentAnalysis: AnalysisResult | null;
}

interface StreamActions {
  setMode: (mode: StreamMode) => void;
  appendTranscript: (chunk: TranscriptChunk) => void;
  setAnalysis: (analysis: AnalysisResult | null) => void;
  setConnected: (connected: boolean) => void;
  reset: () => void;
}

const initialState: StreamState = {
  mode: null,
  transcript: [],
  isConnected: false,
  currentAnalysis: null,
};

export const useStreamStore = create<StreamState & StreamActions>((set) => ({
  ...initialState,

  setMode: (mode) => set({ mode }),

  appendTranscript: (chunk) =>
    set((state) => ({
      transcript: [...state.transcript, chunk],
    })),

  setAnalysis: (analysis) => set({ currentAnalysis: analysis }),

  setConnected: (connected) => set({ isConnected: connected }),

  reset: () => set(initialState),
}));

// Selector for recent transcript text (last N chunks)
export const useRecentTranscript = (limit = 10) =>
  useStreamStore((state) =>
    state.transcript
      .slice(-limit)
      .map((c) => c.text)
      .join(" ")
  );
