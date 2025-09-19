'use client'

import { useState, useEffect } from 'react';
import { Player } from '@/lib/player/Player'; // Updated import path
import type { MeldV0_0_1 } from '@/lib/renderer'; // Updated import path

export default function HomePage() {
  const [meld, setMeld] = useState<MeldV0_0_1 | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadMeld = async () => {
      try {
        const response = await fetch('/examples/carlsen-best-opening-beginners-white.cmf.json');
        if (!response.ok) {
          throw new Error(`Failed to load meld: ${response.status} ${response.statusText}`);
        }
        const meldData: MeldV0_0_1 = await response.json();

        const sortedMeldData = {
          ...meldData,
          events: [...meldData.events].sort((a, b) => a.t - b.t)
        };

        setMeld(sortedMeldData);
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
          <div className="spinner"></div>
          <p>Loading meld...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="app">
        <div className="error">
          <h2>Error</h2>
          <p>{error}</p>
        </div>
      </div>
    );
  }

  if (!meld) {
    return (
      <div className="app">
        <div className="error">
          <h2>No Meld Data</h2>
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
