'use client'

import { useState, useRef, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { 
  Clock, 
  MessageSquare, 
  Move, 
  Circle, 
  ArrowRight, 
  Pause, 
  GitBranch,
  Edit3,
  Check,
  X
} from 'lucide-react'
import { Event } from '@/lib/cmf'

interface EventListProps {
  events: Event[]
  currentTime: number // in milliseconds
  selectedEventIndex: number | null
  onEventSelect: (index: number) => void
  onUpdateTimestamp: (eventIndex: number, newTimestamp: number) => void
  onSetCurrentTime: (eventIndex: number) => void
  onSortEvents: () => void
  formatTime: (ms: number) => string
}

export function EventList({
  events,
  currentTime,
  selectedEventIndex,
  onEventSelect,
  onUpdateTimestamp,
  onSetCurrentTime,
  onSortEvents,
  formatTime
}: EventListProps) {
  const [editingIndex, setEditingIndex] = useState<number | null>(null)
  const [editValue, setEditValue] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (editingIndex !== null && inputRef.current) {
      inputRef.current.focus()
      inputRef.current.select()
    }
  }, [editingIndex])

  const handleEditStart = (index: number, currentTimestamp: number) => {
    setEditingIndex(index)
    setEditValue(formatTime(currentTimestamp))
  }

  const handleEditCancel = () => {
    setEditingIndex(null)
    setEditValue('')
  }

  const handleEditSave = (index: number) => {
    // Parse the time input (format: MM:SS)
    const timeMatch = editValue.match(/^(\d+):(\d{2})$/)
    if (timeMatch) {
      const minutes = parseInt(timeMatch[1], 10)
      const seconds = parseInt(timeMatch[2], 10)
      const newTimestamp = (minutes * 60 + seconds) * 1000 // Convert to milliseconds
      
      onUpdateTimestamp(index, newTimestamp)
    }
    setEditingIndex(null)
    setEditValue('')
  }

  const handleKeyDown = (e: React.KeyboardEvent, index: number) => {
    if (e.key === 'Enter') {
      handleEditSave(index)
    } else if (e.key === 'Escape') {
      handleEditCancel()
    }
  }

  const getEventIcon = (event: Event) => {
    switch (event.type) {
      case 'text':
        return <MessageSquare className="h-4 w-4" />
      case 'move':
        return <Move className="h-4 w-4" />
      case 'annotate':
        return <Circle className="h-4 w-4" />
      case 'pausepoint':
        return <Pause className="h-4 w-4" />
      case 'clear':
        return <Circle className="h-4 w-4" />
      default:
        return <Clock className="h-4 w-4" />
    }
  }

  const getEventTypeColor = (event: Event) => {
    switch (event.type) {
      case 'text':
        return 'bg-blue-100 text-blue-800 border-blue-200'
      case 'move':
        return 'bg-green-100 text-green-800 border-green-200'
      case 'annotate':
        return 'bg-purple-100 text-purple-800 border-purple-200'
      case 'pausepoint':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case 'clear':
        return 'bg-red-100 text-red-800 border-red-200'
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const getEventContent = (event: Event) => {
    switch (event.type) {
      case 'text':
        return event.text
      case 'move':
        return `Move: ${event.san}${event.comment ? ` - ${event.comment}` : ''}`
      case 'annotate':
        const parts = []
        if (event.arrows?.length) parts.push(`${event.arrows.length} arrow(s)`)
        if (event.circles?.length) parts.push(`${event.circles.length} circle(s)`)
        if (event.note) parts.push(`Note: ${event.note}`)
        return parts.join(', ') || 'Annotation'
      case 'pausepoint':
        return `Pause: ${event.prompt || 'Pause point'}`
      case 'clear':
        return 'Clear annotations'
      default:
        return 'Unknown event'
    }
  }

  const isEventActive = (event: Event) => {
    return currentTime >= event.t
  }

  const isEventSelected = (index: number) => {
    return selectedEventIndex === index
  }

  const isEventOutOfOrder = (index: number) => {
    if (index === 0) return false
    return events[index].t < events[index - 1].t
  }

  const isEventsOutOfOrder = () => {
    for (let i = 1; i < events.length; i++) {
      if (events[i].t < events[i - 1].t) {
        return true
      }
    }
    return false
  }

  return (
    <div className="space-y-2">
      {/* Sort Button */}
      {isEventsOutOfOrder() && (
        <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-md">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-amber-500 rounded-full"></div>
              <span className="text-sm text-amber-800 font-medium">
                Events are out of chronological order
              </span>
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={onSortEvents}
              className="text-amber-700 border-amber-300 hover:bg-amber-100"
            >
              Sort by Timestamp
            </Button>
          </div>
        </div>
      )}

      <div className="max-h-96 overflow-y-auto space-y-2">
        {events.map((event, index) => {
        const isActive = isEventActive(event)
        const isSelected = isEventSelected(index)
        const isEditing = editingIndex === index
        const isOutOfOrder = isEventOutOfOrder(index)

        return (
          <Card
            key={index}
            className={`cursor-pointer transition-all ${
              isActive 
                ? 'ring-2 ring-blue-500 bg-blue-50' 
                : isSelected 
                  ? 'ring-2 ring-gray-400 bg-gray-50'
                  : isOutOfOrder
                    ? 'ring-1 ring-amber-300 bg-amber-50'
                    : 'hover:bg-gray-50'
            }`}
            onClick={() => onEventSelect(index)}
          >
            <CardContent className="p-3">
              <div className="flex items-start gap-3">
                {/* Event Icon */}
                <div className={`p-1 rounded ${getEventTypeColor(event)}`}>
                  {getEventIcon(event)}
                </div>

                {/* Event Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <Badge variant="outline" className="text-xs">
                      {event.type}
                    </Badge>
                    {isActive && (
                      <Badge variant="default" className="text-xs bg-blue-600">
                        Active
                      </Badge>
                    )}
                    {isOutOfOrder && (
                      <Badge variant="outline" className="text-xs text-amber-700 border-amber-300">
                        Out of Order
                      </Badge>
                    )}
                  </div>
                  
                  <p className="text-sm text-gray-700 line-clamp-2">
                    {getEventContent(event)}
                  </p>
                </div>

                {/* Timestamp Controls */}
                <div className="flex items-center gap-2">
                  {isEditing ? (
                    <div className="flex items-center gap-1">
                      <Input
                        ref={inputRef}
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        onKeyDown={(e) => handleKeyDown(e, index)}
                        className="w-20 h-8 text-xs"
                        placeholder="MM:SS"
                      />
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleEditSave(index)}
                        className="h-8 w-8 p-0"
                      >
                        <Check className="h-3 w-3" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={handleEditCancel}
                        className="h-8 w-8 p-0"
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={(e) => {
                          e.stopPropagation()
                          handleEditStart(index, event.t)
                        }}
                        className="h-8 px-2 text-xs"
                      >
                        <Edit3 className="h-3 w-3 mr-1" />
                        {formatTime(event.t)}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={(e) => {
                          e.stopPropagation()
                          onSetCurrentTime(index)
                        }}
                        className="h-8 px-2 text-xs"
                      >
                        <ArrowRight className="h-3 w-3 mr-1" />
                        Set
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        )
      })}
      </div>
    </div>
  )
}
