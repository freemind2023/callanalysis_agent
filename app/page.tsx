'use client'

import { useRef, useState } from 'react'
import Image from 'next/image'
import ScoreCard, { type ReviewResult } from '@/components/ScoreCard'

const COURSES = [
  'B.Com', 'BBA', 'BBA-IB', 'MBA', 'Bridge Course', 'M.Com', 'Nurturing Call',
]

const SALES_CALLERS = ['Aiswarya', 'Kimaya', 'Sakshi']

const MAX_FILE_SIZE_MB = 25
const ACCEPTED_TYPES = ['audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/x-wav', 'audio/mp4', 'audio/m4a', 'audio/ogg', 'audio/webm']
const ACCEPTED_EXT = '.mp3,.wav,.m4a,.ogg,.webm'

// Deepgram Nova-2: $0.0043/min | Claude Sonnet 4.6: $3/MTok in, $15/MTok out
function estimateCost(durationSecs: number) {
  const mins = durationSecs / 60
  const deepgramCost = mins * 0.0043
  const inputTokens = 800 + Math.round(mins * 200)
  const claudeCost = (inputTokens * 3 + 450 * 15) / 1_000_000
  return { deepgramCost, claudeCost, total: deepgramCost + claudeCost, mins }
}

function getAudioDuration(file: File): Promise<number> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file)
    const audio = document.createElement('audio')
    audio.onloadedmetadata = () => { URL.revokeObjectURL(url); resolve(isFinite(audio.duration) ? audio.duration : 0) }
    audio.onerror = () => { URL.revokeObjectURL(url); resolve(0) }
    audio.src = url
  })
}

function fmtDuration(secs: number) {
  const m = Math.floor(secs / 60)
  const s = Math.round(secs % 60)
  return m > 0 ? `${m} min ${s} sec` : `${s} sec`
}

type Status = 'idle' | 'transcribing' | 'analysing' | 'done' | 'error'

export default function Home() {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [file, setFile] = useState<File | null>(null)
  const [callerName, setCallerName] = useState('')
  const [course, setCourse] = useState(COURSES[0])
  const [salesCaller, setSalesCaller] = useState(SALES_CALLERS[0])
  const [audioDuration, setAudioDuration] = useState<number>(0)
  const [isDragging, setIsDragging] = useState(false)
  const [status, setStatus] = useState<Status>('idle')
  const [error, setError] = useState<string | null>(null)
  const [review, setReview] = useState<ReviewResult | null>(null)
  const [sheetsSaved, setSheetsSaved] = useState(false)

  async function handleFileSelect(selected: File | null) {
    if (!selected) return
    if (selected.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
      setError(`File too large. Maximum size is ${MAX_FILE_SIZE_MB} MB.`); return
    }
    if (!ACCEPTED_TYPES.includes(selected.type) && !selected.name.match(/\.(mp3|wav|m4a|ogg|webm)$/i)) {
      setError('Unsupported file type. Please upload MP3, WAV, M4A, OGG, or WebM.'); return
    }
    setFile(selected)
    setError(null)
    setReview(null)
    setSheetsSaved(false)
    const secs = await getAudioDuration(selected)
    setAudioDuration(secs)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!file) return

    setError(null)
    setReview(null)
    setSheetsSaved(false)

    try {
      // Step 1 — Transcribe
      setStatus('transcribing')
      const formData = new FormData()
      formData.append('audio', file)

      const transcribeRes = await fetch('/api/transcribe', { method: 'POST', body: formData })
      const transcribeData = await transcribeRes.json()
      if (!transcribeRes.ok || transcribeData.error) throw new Error(transcribeData.error || 'Transcription failed')

      const { transcript } = transcribeData as { transcript: string }
      if (!transcript || transcript.trim().length === 0)
        throw new Error('No speech detected in the audio file. Please check the recording.')

      // Step 2 — Analyse
      setStatus('analysing')
      const reviewRes = await fetch('/api/review', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transcript, callerName, course, salesCaller }),
      })
      const reviewData = await reviewRes.json()
      if (!reviewRes.ok || reviewData.error) throw new Error(reviewData.error || 'Analysis failed')

      const result = reviewData as ReviewResult
      setReview(result)
      setStatus('done')

      // Step 3 — Save to Google Sheets (fire-and-forget)
      fetch('/api/save-to-sheets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...result,
          callerName,
          salesCaller,
          course,
          durationMins: audioDuration > 0 ? audioDuration / 60 : undefined,
        }),
      }).then(() => setSheetsSaved(true)).catch(() => null)

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.')
      setStatus('error')
    }
  }

  const isLoading = status === 'transcribing' || status === 'analysing'
  const cost = audioDuration > 0 ? estimateCost(audioDuration) : null

  return (
    <main className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 py-10 px-4">
      <div className="max-w-2xl mx-auto">

        {/* Header */}
        <div className="text-center mb-8 no-print">
          <div className="flex justify-center mb-3">
            <Image
              src="/peslogo.png"
              alt="Practical Eduskills"
              width={96}
              height={96}
              className="rounded-xl shadow-md object-contain bg-white p-1"
              priority
            />
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
                  e.preventDefault(); setIsDragging(false)
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

              {/* Cost estimate */}
              {cost && (
                <div className="mt-2 flex items-center gap-3 px-3 py-2 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800">
                  <svg className="w-4 h-4 shrink-0 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span>
                    <span className="font-semibold">~{fmtDuration(audioDuration)}</span>
                    <span className="mx-1.5 text-amber-400">·</span>
                    Transcription <span className="font-semibold">${cost.deepgramCost.toFixed(4)}</span>
                    <span className="mx-1.5 text-amber-400">+</span>
                    AI Analysis <span className="font-semibold">${cost.claudeCost.toFixed(4)}</span>
                    <span className="mx-1.5 text-amber-400">=</span>
                    Est. cost <span className="font-semibold text-amber-900">${cost.total.toFixed(4)}</span>
                  </span>
                </div>
              )}
            </div>

            {/* Caller name + Course */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Student Name <span className="text-gray-400 font-normal">(optional)</span>
                </label>
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
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Course / Call Type</label>
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

            {/* Sales Caller */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Sales Caller</label>
              <select
                value={salesCaller}
                onChange={(e) => setSalesCaller(e.target.value)}
                disabled={isLoading}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-60 bg-white"
              >
                {SALES_CALLERS.map((s) => <option key={s}>{s}</option>)}
              </select>
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

            {/* Sheets saved indicator */}
            {sheetsSaved && (
              <div className="flex items-center gap-2 text-xs text-green-700">
                <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                Saved to Google Sheets
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
          <ScoreCard
            result={review}
            callerName={callerName || undefined}
            salesCaller={salesCaller}
            course={course}
            durationSecs={audioDuration || undefined}
          />
        )}
      </div>
    </main>
  )
}
