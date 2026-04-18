'use client'

import { useRef, useState } from 'react'
import ScoreCard, { type ReviewResult } from '@/components/ScoreCard'

const COURSES = ['B.Com', 'BBA', 'BBA-IB', 'MBA', 'Bridge Course', 'M.Com']

const MAX_FILE_SIZE_MB = 25
const ACCEPTED_TYPES = ['audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/x-wav', 'audio/mp4', 'audio/m4a', 'audio/ogg', 'audio/webm']
const ACCEPTED_EXT = '.mp3,.wav,.m4a,.ogg,.webm'

type Status = 'idle' | 'transcribing' | 'analysing' | 'done' | 'error'

export default function Home() {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [file, setFile] = useState<File | null>(null)
  const [callerName, setCallerName] = useState('')
  const [course, setCourse] = useState(COURSES[0])
  const [isDragging, setIsDragging] = useState(false)
  const [status, setStatus] = useState<Status>('idle')
  const [error, setError] = useState<string | null>(null)
  const [review, setReview] = useState<ReviewResult | null>(null)

  function handleFileSelect(selected: File | null) {
    if (!selected) return
    if (selected.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
      setError(`File too large. Maximum size is ${MAX_FILE_SIZE_MB} MB.`)
      return
    }
    if (ACCEPTED_TYPES.length > 0 && !ACCEPTED_TYPES.includes(selected.type) && !selected.name.match(/\.(mp3|wav|m4a|ogg|webm)$/i)) {
      setError('Unsupported file type. Please upload MP3, WAV, M4A, OGG, or WebM.')
      return
    }
    setFile(selected)
    setError(null)
    setReview(null)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!file) return

    setError(null)
    setReview(null)

    try {
      // Step 1 — Transcribe
      setStatus('transcribing')
      const formData = new FormData()
      formData.append('audio', file)

      const transcribeRes = await fetch('/api/transcribe', { method: 'POST', body: formData })
      const transcribeData = await transcribeRes.json()

      if (!transcribeRes.ok || transcribeData.error) {
        throw new Error(transcribeData.error || 'Transcription failed')
      }

      const { transcript } = transcribeData as { transcript: string }

      if (!transcript || transcript.trim().length === 0) {
        throw new Error('No speech detected in the audio file. Please check the recording.')
      }

      // Step 2 — Analyse
      setStatus('analysing')
      const reviewRes = await fetch('/api/review', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transcript, callerName, course }),
      })
      const reviewData = await reviewRes.json()

      if (!reviewRes.ok || reviewData.error) {
        throw new Error(reviewData.error || 'Analysis failed')
      }

      setReview(reviewData as ReviewResult)
      setStatus('done')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.')
      setStatus('error')
    }
  }

  const isLoading = status === 'transcribing' || status === 'analysing'

  return (
    <main className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 py-10 px-4">
      <div className="max-w-2xl mx-auto">

        {/* Header */}
        <div className="text-center mb-8 no-print">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-900 rounded-2xl mb-4 shadow-md">
            <span className="text-white font-black text-xl tracking-tight">PES</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Call Quality Reviewer</h1>
          <p className="text-sm text-gray-500 mt-1">Practical Eduskills · Internal Tool</p>
        </div>

        {/* Upload Form */}
        <div className="bg-white rounded-2xl shadow-sm p-6 no-print">
          <form onSubmit={handleSubmit} className="space-y-5">

            {/* Drop zone */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Audio File</label>
              <div
                role="button"
                tabIndex={0}
                onKeyDown={(e) => e.key === 'Enter' && fileInputRef.current?.click()}
                onClick={() => !isLoading && fileInputRef.current?.click()}
                onDragOver={(e) => { e.preventDefault(); if (!isLoading) setIsDragging(true) }}
                onDragEnter={(e) => { e.preventDefault(); if (!isLoading) setIsDragging(true) }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={(e) => {
                  e.preventDefault()
                  setIsDragging(false)
                  if (!isLoading) handleFileSelect(e.dataTransfer.files[0] ?? null)
                }}
                className={`
                  relative flex flex-col items-center justify-center border-2 border-dashed rounded-xl p-8 cursor-pointer
                  transition-colors select-none
                  ${isDragging ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-gray-400 bg-gray-50'}
                  ${isLoading ? 'opacity-60 cursor-not-allowed' : ''}
                `}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  className="hidden"
                  accept={ACCEPTED_EXT}
                  disabled={isLoading}
                  onChange={(e) => handleFileSelect(e.target.files?.[0] ?? null)}
                />
                {file ? (
                  <>
                    <svg className="w-10 h-10 text-blue-500 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                        d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
                    </svg>
                    <p className="font-medium text-gray-800 text-sm">{file.name}</p>
                    <p className="text-xs text-gray-400 mt-1">{(file.size / (1024 * 1024)).toFixed(2)} MB · Click to change</p>
                  </>
                ) : (
                  <>
                    <svg className="w-10 h-10 text-gray-400 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                        d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                    </svg>
                    <p className="text-sm font-medium text-gray-600">Drop audio file here or <span className="text-blue-600">browse</span></p>
                    <p className="text-xs text-gray-400 mt-1">MP3, WAV, M4A, OGG · Max {MAX_FILE_SIZE_MB} MB</p>
                  </>
                )}
              </div>
            </div>

            {/* Caller name + Course */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Caller Name <span className="text-gray-400 font-normal">(optional)</span></label>
                <input
                  type="text"
                  value={callerName}
                  onChange={(e) => setCallerName(e.target.value)}
                  placeholder="e.g. Priya Sharma"
                  disabled={isLoading}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-60"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Course</label>
                <select
                  value={course}
                  onChange={(e) => setCourse(e.target.value)}
                  disabled={isLoading}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-60 bg-white"
                >
                  {COURSES.map((c) => <option key={c}>{c}</option>)}
                </select>
              </div>
            </div>

            {/* Error */}
            {error && (
              <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                <svg className="w-4 h-4 shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
                {error}
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={!file || isLoading}
              className="w-full py-3 px-4 rounded-xl font-semibold text-white transition-all
                bg-blue-900 hover:bg-blue-800 active:scale-[0.99]
                disabled:opacity-50 disabled:cursor-not-allowed
                flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <>
                  <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  {status === 'transcribing' ? 'Transcribing audio...' : 'Analysing call...'}
                </>
              ) : (
                'Analyse Call'
              )}
            </button>
          </form>
        </div>

        {/* ScoreCard */}
        {review && (
          <ScoreCard result={review} callerName={callerName || undefined} course={course} />
        )}
      </div>
    </main>
  )
}
