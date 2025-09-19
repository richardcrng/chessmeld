'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Info, BookOpen, GraduationCap, Zap } from 'lucide-react'
import type { LegalPolicy } from '@/types/graph-studio'

interface LegalPolicyToggleProps {
  currentPolicy: LegalPolicy
  onPolicyChange: (policy: LegalPolicy) => void
  disabled?: boolean
  className?: string
}

const policyConfig = {
  strict: {
    label: 'Structured',
    icon: BookOpen,
    description: 'By the book: legal moves, turn order.',
    color: 'bg-blue-100 text-blue-800 border-blue-200',
    activeColor: 'bg-blue-500 text-white border-blue-500'
  },
  pieceLegal: {
    label: 'Classroom',
    icon: GraduationCap,
    description: 'Teach freely: piece-legal moves, any side can move.',
    color: 'bg-green-100 text-green-800 border-green-200',
    activeColor: 'bg-green-500 text-white border-green-500'
  },
  none: {
    label: 'Free',
    icon: Zap,
    description: 'Sandbox: place or move anything.',
    color: 'bg-purple-100 text-purple-800 border-purple-200',
    activeColor: 'bg-purple-500 text-white border-purple-500'
  }
} as const

export function LegalPolicyToggle({ 
  currentPolicy, 
  onPolicyChange, 
  disabled = false,
  className = ''
}: LegalPolicyToggleProps) {
  const [showDetails, setShowDetails] = useState(false)

  return (
    <div className={`space-y-3 ${className}`}>
      {/* Main Toggle */}
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium text-gray-700">Recording Mode:</span>
        <div className="flex gap-1 p-1 bg-gray-100 rounded-lg">
          {(Object.keys(policyConfig) as LegalPolicy[]).map((policy) => {
            const config = policyConfig[policy]
            const Icon = config.icon
            const isActive = currentPolicy === policy
            
            return (
              <Button
                key={policy}
                variant="ghost"
                size="sm"
                onClick={() => onPolicyChange(policy)}
                disabled={disabled}
                className={`flex items-center gap-2 px-3 py-2 text-xs font-medium transition-all ${
                  isActive 
                    ? config.activeColor 
                    : `${config.color} hover:opacity-80`
                } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                <Icon className="h-3 w-3" />
                {config.label}
              </Button>
            )
          })}
        </div>
        
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowDetails(!showDetails)}
          className="p-1 h-6 w-6"
        >
          <Info className="h-4 w-4 text-gray-500" />
        </Button>
      </div>

      {/* Current Policy Description */}
      <div className="text-xs text-gray-600">
        {policyConfig[currentPolicy].description}
      </div>

      {/* Detailed Information */}
      {showDetails && (
        <div className="space-y-2 p-3 bg-gray-50 rounded-lg border">
          <h4 className="text-sm font-medium text-gray-800">Recording Modes Explained</h4>
          <div className="space-y-2 text-xs text-gray-600">
            <div className="flex items-start gap-2">
              <BookOpen className="h-3 w-3 mt-0.5 text-blue-500" />
              <div>
                <strong>Structured:</strong> Enforces full chess legality including turn alternation, 
                check rules, and all standard chess constraints. Perfect for recording actual games.
              </div>
            </div>
            <div className="flex items-start gap-2">
              <GraduationCap className="h-3 w-3 mt-0.5 text-green-500" />
              <div>
                <strong>Classroom:</strong> Allows piece-legal moves without turn alternation. 
                Great for teaching openings, demonstrating positions, or showing "what if" scenarios.
              </div>
            </div>
            <div className="flex items-start gap-2">
              <Zap className="h-3 w-3 mt-0.5 text-purple-500" />
              <div>
                <strong>Free:</strong> No validation whatsoever. Place or move pieces anywhere. 
                Useful for creating custom positions or experimental setups.
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Current Policy Badge */}
      <div className="flex items-center gap-2">
        <Badge 
          variant="outline" 
          className={`text-xs ${policyConfig[currentPolicy].color}`}
        >
          {(() => {
            const Icon = policyConfig[currentPolicy].icon
            return Icon ? <Icon className="h-3 w-3 mr-1" /> : null
          })()}
          {policyConfig[currentPolicy].label} Mode
        </Badge>
        {disabled && (
          <Badge variant="secondary" className="text-xs">
            Disabled
          </Badge>
        )}
      </div>
    </div>
  )
}
