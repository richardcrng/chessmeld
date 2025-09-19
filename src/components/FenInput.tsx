'use client'

import { useState } from 'react'
import { Chess } from 'chess.js'

interface FenInputProps {
  initialFen?: string
  onFenChange: (fen: string) => void
  onCancel?: () => void
}

export function FenInput({ initialFen, onFenChange, onCancel }: FenInputProps) {
  const [fen, setFen] = useState(initialFen || 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1')
  const [error, setError] = useState<string | null>(null)

  const validateFen = (fenString: string): boolean => {
    try {
      const chess = new Chess(fenString)
      return true
    } catch (err) {
      return false
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    if (validateFen(fen)) {
      setError(null)
      onFenChange(fen)
    } else {
      setError('Invalid FEN position')
    }
  }

  const handleReset = () => {
    const defaultFen = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'
    setFen(defaultFen)
    setError(null)
  }

  const handleLoadExample = (exampleFen: string) => {
    setFen(exampleFen)
    setError(null)
  }

  const examples = [
    {
      name: 'Starting Position',
      fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'
    },
    {
      name: 'Italian Game',
      fen: 'r1bqkbnr/pppp1ppp/2n5/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R w KQkq - 2 3'
    },
    {
      name: 'Sicilian Defense',
      fen: 'rnbqkbnr/pp1ppppp/8/2p5/4P3/8/PPPP1PPP/RNBQKBNR w KQkq c6 0 2'
    },
    {
      name: 'Endgame (K+Q vs K)',
      fen: '8/8/8/8/8/8/4K3/4Q3 w - - 0 1'
    }
  ]

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6">
      <h3 className="text-lg font-semibold mb-4">Set Starting Position</h3>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="fen" className="block text-sm font-medium text-gray-700 mb-1">
            FEN String
          </label>
          <textarea
            id="fen"
            value={fen}
            onChange={(e) => {
              setFen(e.target.value)
              setError(null)
            }}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm"
            rows={3}
            placeholder="Enter FEN position..."
          />
          {error && (
            <p className="text-red-600 text-sm mt-1">{error}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Quick Examples
          </label>
          <div className="grid grid-cols-2 gap-2">
            {examples.map((example, index) => (
              <button
                key={index}
                type="button"
                onClick={() => handleLoadExample(example.fen)}
                className="text-left p-2 border border-gray-200 rounded hover:bg-gray-50 transition-colors"
              >
                <div className="font-medium text-sm">{example.name}</div>
                <div className="text-xs text-gray-500 font-mono truncate">{example.fen}</div>
              </button>
            ))}
          </div>
        </div>

        <div className="flex gap-3 pt-4">
          <button
            type="submit"
            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md font-medium transition-colors"
          >
            Use This Position
          </button>
          <button
            type="button"
            onClick={handleReset}
            className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors"
          >
            Reset
          </button>
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
          )}
        </div>
      </form>
    </div>
  )
}
