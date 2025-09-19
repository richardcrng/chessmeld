import React, { useState, useEffect } from 'react';
import { Player } from './Player';
import type { MeldV0_0_1 } from '@/lib/renderer';

// Example meld data - in a real app this would be loaded from a file or API
const exampleMeld: MeldV0_0_1 = {
  schema: "cmf.v0.0.1",
  meta: {
    id: "lesson-0001",
    title: "Italian Game Primer",
    author: "GM Jane Example",
    createdAt: "2025-09-09T10:00:00Z",
    startingFen: "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1",
    durationMs: 287000,
    tags: ["opening", "e4-e5"],
    engineHints: true,
    audioUrl: "/audio/italian-game.mp3" // This would be a real audio file
  },
  rootNodeId: "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1",
  nodes: {
    "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1": {
      fen: "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1",
      children: [
        { move: "e4", fen: "rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1" }
      ],
      parents: [],
      moveNumber: 0
    },
    "rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1": {
      fen: "rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1",
      children: [
        { move: "e5", fen: "rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq e6 0 2" }
      ],
      parents: [{ fen: "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1", move: "e4" }],
      moveNumber: 1
    }
  },
  events: [
    { t: 0, type: "text", text: "Welcome to the Italian Game!", fen: "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1" },
    { t: 1200, type: "move", from: "e2", to: "e4", san: "e4", fen: "rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1", color: "w", moveNumber: 1, legalPolicy: "strict" },
    { t: 2200, type: "annotate", arrows: [{ from: "e2", to: "e4", color: "yellow" }], circles: [{ square: "e4", color: "yellow" }], fen: "rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1" },
    { t: 3200, type: "move", from: "e7", to: "e5", san: "e5", fen: "rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq e6 0 2", color: "b", moveNumber: 1, legalPolicy: "strict" },
    { t: 4200, type: "pausepoint", id: "try-it-1", prompt: "Find a developing move.", fen: "rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq e6 0 2" },
    { t: 5000, type: "move", from: "g1", to: "f3", san: "Nf3", fen: "rnbqkbnr/pppp1ppp/8/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R b KQkq - 1 2", color: "w", moveNumber: 2, legalPolicy: "strict" },
    { t: 6000, type: "move", from: "b8", to: "c6", san: "Nc6", fen: "r1bqkbnr/pppp1ppp/2n5/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R w KQkq - 2 3", color: "b", moveNumber: 2, legalPolicy: "strict" },
    { t: 7000, type: "move", from: "f1", to: "c4", san: "Bc4", fen: "r1bqkbnr/pppp1ppp/2n5/4p3/2B1P3/5N2/PPPP1PPP/RNBQK1R b KQkq - 3 3", color: "w", moveNumber: 3, legalPolicy: "strict" },
    { t: 8000, type: "annotate", arrows: [{ from: "f1", to: "c4", color: "yellow" }], circles: [{ square: "c4", color: "yellow" }], fen: "r1bqkbnr/pppp1ppp/2n5/4p3/2B1P3/5N2/PPPP1PPP/RNBQK1R b KQkq - 3 3" },
    { t: 9000, type: "text", text: "The Italian Game begins with this bishop development.", fen: "r1bqkbnr/pppp1ppp/2n5/4p3/2B1P3/5N2/PPPP1PPP/RNBQK1R b KQkq - 3 3" }
  ],
  overlays: {
    legend: "Yellow circles = targets; green arrows = candidate plans."
  }
};

export function App() {
  const [meld, setMeld] = useState<MeldV0_0_1 | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Simulate loading the meld
    const loadMeld = async () => {
      try {
        // In a real app, you might fetch this from an API or load from a file
        await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate network delay
        setMeld(exampleMeld);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load meld');
      } finally {
        setLoading(false);
      }
    };

    loadMeld();
  }, []);

  if (loading) {
    return (
      <div className="app">
        <div className="loading">
          <p>Loading meld...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="app">
        <div className="error">
          <p>Error: {error}</p>
        </div>
      </div>
    );
  }

  if (!meld) {
    return (
      <div className="app">
        <div className="error">
          <p>No meld data available</p>
        </div>
      </div>
    );
  }

  return (
    <div className="app">
      <Player meld={meld} />
    </div>
  );
}
