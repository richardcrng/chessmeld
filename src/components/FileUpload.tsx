'use client'

import { useRef, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Upload, File } from 'lucide-react'

interface FileUploadProps {
  accept: string
  onFileSelect: (file: File) => void
  label: string
  maxSize?: number // in MB
}

export function FileUpload({ 
  accept, 
  onFileSelect, 
  label, 
  maxSize = 50 
}: FileUploadProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileSelect = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    // Check file size
    if (file.size > maxSize * 1024 * 1024) {
      alert(`File size must be less than ${maxSize}MB`)
      return
    }

    onFileSelect(file)
    
    // Reset the input so the same file can be selected again
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }, [onFileSelect, maxSize])

  const handleClick = useCallback(() => {
    fileInputRef.current?.click()
  }, [])

  return (
    <div className="space-y-2">
      <input
        ref={fileInputRef}
        type="file"
        accept={accept}
        onChange={handleFileSelect}
        className="hidden"
      />
      
      <Button
        variant="outline"
        onClick={handleClick}
        className="w-full h-20 border-dashed border-2 hover:border-solid"
      >
        <div className="flex flex-col items-center gap-2">
          <Upload className="h-6 w-6 text-muted-foreground" />
          <span className="text-sm font-medium">{label}</span>
          <span className="text-xs text-muted-foreground">
            Max {maxSize}MB
          </span>
        </div>
      </Button>
      
      <div className="text-xs text-muted-foreground text-center">
        <p>Accepted formats: {accept}</p>
      </div>
    </div>
  )
}
