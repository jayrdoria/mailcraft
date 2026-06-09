'use client'

import { useRef, useState } from 'react'
import { Upload, FileText, X, AlertCircle, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { apiFetch } from '@/lib/apiFetch'
import type { AnalyzeResult } from '@/lib/types/import'

interface UploadStepProps {
  onSuccess: (result: AnalyzeResult) => void
}

export default function UploadStep({ onSuccess }: UploadStepProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [file, setFile] = useState<File | null>(null)
  const [isDragOver, setIsDragOver] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function handleFile(f: File) {
    if (!f.name.endsWith('.html') && !f.name.endsWith('.htm')) {
      setError('Only .html files are accepted')
      return
    }
    setError(null)
    setFile(f)
  }

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault()
    setIsDragOver(true)
  }

  function handleDragLeave() {
    setIsDragOver(false)
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    setIsDragOver(false)
    const dropped = e.dataTransfer.files[0]
    if (dropped) handleFile(dropped)
  }

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const picked = e.target.files?.[0]
    if (picked) handleFile(picked)
  }

  function clearFile(e: React.MouseEvent) {
    e.stopPropagation()
    setFile(null)
    setError(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  async function handleAnalyze() {
    if (!file) return
    setUploading(true)
    setError(null)

    try {
      const form = new FormData()
      form.append('file', file)
      const res = await apiFetch('/api/import/analyze', { method: 'POST', body: form })
      const json = await res.json()

      if (!res.ok) {
        setError(json.error ?? 'Failed to analyze file')
        return
      }

      onSuccess(json.data as AnalyzeResult)
    } catch {
      setError('Network error — please try again')
    } finally {
      setUploading(false)
    }
  }

  return (
    <>
      <div className="flex-1 overflow-y-auto px-5 py-5">
        <p className="text-xs text-muted-foreground mb-4">
          Upload any HTML email file. The system detects editable elements so you can label them in the next step.
        </p>

        {/* Drop zone */}
        <div
          onClick={() => !file && fileInputRef.current?.click()}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={cn(
            'rounded-lg border-2 border-dashed transition-colors',
            file
              ? 'border-primary/40 bg-primary/5'
              : isDragOver
              ? 'border-primary bg-primary/5 cursor-copy'
              : 'border-muted-foreground/25 hover:border-muted-foreground/50 cursor-pointer'
          )}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".html,.htm"
            className="sr-only"
            onChange={handleInputChange}
          />

          {file ? (
            <div className="flex items-center gap-3 px-4 py-5">
              <FileText className="w-8 h-8 text-primary shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{file.name}</p>
                <p className="text-[11px] text-muted-foreground">
                  {(file.size / 1024).toFixed(1)} KB
                </p>
              </div>
              <button
                onClick={clearFile}
                className="p-1 rounded-md hover:bg-accent transition-colors cursor-pointer shrink-0"
              >
                <X className="w-4 h-4 text-muted-foreground" />
              </button>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2 py-12">
              <Upload className="w-8 h-8 text-muted-foreground/40" />
              <p className="text-sm text-muted-foreground">
                Drop your HTML file here, or{' '}
                <span className="text-primary underline underline-offset-2">browse</span>
              </p>
              <p className="text-[11px] text-muted-foreground/60">Accepts .html — max 2 MB</p>
            </div>
          )}
        </div>

        {error && (
          <div className="flex items-center gap-2 mt-3 text-[12px] text-destructive">
            <AlertCircle className="w-3.5 h-3.5 shrink-0" />
            {error}
          </div>
        )}
      </div>

      <div className="flex items-center justify-end gap-2 px-5 py-4 border-t shrink-0">
        <button
          onClick={handleAnalyze}
          disabled={!file || uploading}
          className={cn(
            'flex items-center gap-2 px-4 py-1.5 text-xs font-medium rounded-md',
            'bg-primary text-primary-foreground hover:opacity-90 transition-opacity cursor-pointer',
            'disabled:opacity-50 disabled:cursor-not-allowed'
          )}
        >
          {uploading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
          {uploading ? 'Analyzing…' : 'Analyze File →'}
        </button>
      </div>
    </>
  )
}
