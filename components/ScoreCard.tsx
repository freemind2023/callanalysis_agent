'use client'

import Image from 'next/image'

interface ParameterScore {
  score: number
  comment: string
}

export interface ReviewResult {
  scores: {
    greeting: ParameterScore
    needs_discovery: ParameterScore
    course_pitch: ParameterScore
    objection_handling: ParameterScore
    call_to_action: ParameterScore
    language_clarity: ParameterScore
    enthusiasm: ParameterScore
    closing: ParameterScore
  }
  total: number
  grade: 'A' | 'B' | 'C' | 'D'
  summary: string
  top_strengths: string[]
  areas_to_improve: string[]
  marathi_flag: boolean
}

interface Props {
  result: ReviewResult
  callerName?: string
  salesCaller?: string
  course?: string
  durationSecs?: number
}

const PARAMETERS: { key: keyof ReviewResult['scores']; label: string }[] = [
  { key: 'greeting', label: 'Greeting & Introduction' },
  { key: 'needs_discovery', label: 'Needs Discovery' },
  { key: 'course_pitch', label: 'Course Pitch' },
  { key: 'objection_handling', label: 'Objection Handling' },
  { key: 'call_to_action', label: 'Call to Action' },
  { key: 'language_clarity', label: 'Language & Clarity' },
  { key: 'enthusiasm', label: 'Enthusiasm & Energy' },
  { key: 'closing', label: 'Closing' },
]

function gradeStyle(grade: string) {
  switch (grade) {
    case 'A': return 'bg-green-100 text-green-800 border-green-300'
    case 'B': return 'bg-blue-100 text-blue-800 border-blue-300'
    case 'C': return 'bg-yellow-100 text-yellow-800 border-yellow-300'
    default:  return 'bg-red-100 text-red-800 border-red-300'
  }
}

function gradeLabel(grade: string) {
  switch (grade) {
    case 'A': return 'Excellent'
    case 'B': return 'Good'
    case 'C': return 'Average'
    default:  return 'Needs Work'
  }
}

function scoreBarColor(score: number) {
  if (score >= 8) return 'bg-green-500'
  if (score >= 6) return 'bg-blue-500'
  if (score >= 4) return 'bg-yellow-500'
  return 'bg-red-500'
}

function scoreTextColor(score: number) {
  if (score >= 8) return 'text-green-700'
  if (score >= 6) return 'text-blue-700'
  if (score >= 4) return 'text-yellow-700'
  return 'text-red-700'
}

export default function ScoreCard({ result, callerName, salesCaller, course, durationSecs }: Props) {
  const percentage = Math.round((result.total / 80) * 100)
  const printDate = new Date().toLocaleDateString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
  })

  return (
    <div className="bg-white rounded-2xl shadow-lg p-6 mt-6 max-w-3xl mx-auto print:shadow-none print:p-4 print:mt-0">

      {/* Print header — only visible when printing */}
      <div className="hidden print:flex items-center gap-3 mb-4 pb-4 border-b border-gray-200">
        <Image src="/peslogo.png" alt="PES" width={48} height={48} className="object-contain" />
        <div>
          <p className="font-bold text-gray-900 text-sm">Practical Eduskills</p>
          <p className="text-xs text-gray-500">Call Quality Report · {printDate}</p>
        </div>
      </div>

      {/* Header */}
      <div className="flex items-start justify-between mb-5">
        <div className="space-y-0.5">
          <h2 className="text-xl font-bold text-gray-900">Call Quality Report</h2>
          <p className="text-xs text-gray-400">{printDate}</p>
          {salesCaller && (
            <p className="text-sm text-gray-700 mt-1">
              Sales Caller: <span className="font-semibold text-blue-900">{salesCaller}</span>
            </p>
          )}
          {callerName && <p className="text-sm text-gray-700">Student: <span className="font-medium">{callerName}</span></p>}
          {course && <p className="text-sm text-gray-700">Course: <span className="font-medium">{course}</span></p>}
          {durationSecs && durationSecs > 0 && (
            <p className="text-xs text-gray-400">
              Duration: {Math.floor(durationSecs / 60)}m {Math.round(durationSecs % 60)}s
            </p>
          )}
        </div>
        <div className="flex flex-col items-end gap-2 shrink-0 ml-4">
          <div className="text-right">
            <span className="text-5xl font-extrabold text-gray-900">{result.total}</span>
            <span className="text-xl text-gray-400">/80</span>
          </div>
          <div className="text-right text-sm text-gray-500">{percentage}%</div>
          <div className="flex items-center gap-2 flex-wrap justify-end">
            <span className={`px-3 py-1 rounded-full border-2 text-xl font-black ${gradeStyle(result.grade)}`}>
              {result.grade}
            </span>
            <span className={`text-xs font-medium px-2 py-1 rounded-full ${gradeStyle(result.grade)}`}>
              {gradeLabel(result.grade)}
            </span>
            {result.marathi_flag && (
              <span className="px-2 py-1 rounded-full bg-purple-100 text-purple-700 text-xs font-medium border border-purple-300">
                Marathi ✓
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Score parameters */}
      <div className="space-y-3 mb-6">
        {PARAMETERS.map(({ key, label }) => {
          const { score, comment } = result.scores[key]
          return (
            <div key={key}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-medium text-gray-700">{label}</span>
                <span className={`text-sm font-bold ${scoreTextColor(score)}`}>{score}/10</span>
              </div>
              <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${scoreBarColor(score)}`}
                  style={{ width: `${(score / 10) * 100}%` }}
                />
              </div>
              {comment && <p className="text-xs text-gray-500 mt-1 leading-relaxed">{comment}</p>}
            </div>
          )
        })}
      </div>

      {/* Summary */}
      <div className="bg-gray-50 rounded-xl p-4 mb-5">
        <h3 className="text-sm font-semibold text-gray-700 mb-1.5">Overall Summary</h3>
        <p className="text-sm text-gray-600 leading-relaxed">{result.summary}</p>
      </div>

      {/* Strengths & Improvements */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div>
          <h3 className="text-sm font-semibold text-green-700 mb-2">Top Strengths</h3>
          <ul className="space-y-1.5">
            {result.top_strengths.map((s, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                <span className="text-green-500 mt-0.5 shrink-0">●</span>{s}
              </li>
            ))}
          </ul>
        </div>
        <div>
          <h3 className="text-sm font-semibold text-orange-600 mb-2">Areas to Improve</h3>
          <ul className="space-y-1.5">
            {result.areas_to_improve.map((a, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                <span className="text-orange-400 mt-0.5 shrink-0">●</span>{a}
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Print button */}
      <div className="no-print flex justify-end">
        <button
          onClick={() => window.print()}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
          </svg>
          Print / Save PDF
        </button>
      </div>
    </div>
  )
}
