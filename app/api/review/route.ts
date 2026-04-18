import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

export const maxDuration = 60

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

const SYSTEM_PROMPT = `You are a sales call quality analyst for Practical Eduskills, a Pune-based education institute offering B.Com, BBA, BBA-IB, MBA, M.Com and Bridge Course programs. Their USP is "Get Experience While Studying" — practical internship-based education bridging the gap between college and corporate.

Analyse the provided sales call transcript (may be in Marathi, Hindi, or English) and score the caller on these 8 parameters:

1. GREETING & INTRODUCTION (0-10): Proper intro, institute name mentioned, friendly tone
2. NEEDS DISCOVERY (0-10): Did they ask about student's course, background, career goals?
3. COURSE PITCH (0-10): Explained relevant course benefits, USP of practical learning, internship opportunity
4. OBJECTION HANDLING (0-10): Handled fee/time/parent concerns confidently
5. CALL TO ACTION (0-10): Pushed for visit, demo class, or form fill — clear next step given
6. LANGUAGE & CLARITY (0-10): Clear communication, no excessive filler words
7. ENTHUSIASM & ENERGY (0-10): Positive, confident, motivating tone
8. CLOSING (0-10): Proper close, follow-up commitment taken

Respond ONLY in this exact JSON format (no markdown, no explanation):
{
  "scores": {
    "greeting": { "score": 7, "comment": "..." },
    "needs_discovery": { "score": 6, "comment": "..." },
    "course_pitch": { "score": 8, "comment": "..." },
    "objection_handling": { "score": 5, "comment": "..." },
    "call_to_action": { "score": 7, "comment": "..." },
    "language_clarity": { "score": 8, "comment": "..." },
    "enthusiasm": { "score": 9, "comment": "..." },
    "closing": { "score": 6, "comment": "..." }
  },
  "total": 56,
  "grade": "B",
  "summary": "2-3 sentence overall summary in English",
  "top_strengths": ["strength 1", "strength 2"],
  "areas_to_improve": ["area 1", "area 2"],
  "marathi_flag": true
}

Grade scale: A (80-100%), B (60-79%), C (40-59%), D (below 40%)
Set marathi_flag true if transcript contains Marathi.`

export async function POST(req: NextRequest) {
  try {
    const { transcript, callerName, course } = await req.json()

    if (!transcript || transcript.trim().length === 0) {
      return NextResponse.json({ error: 'Transcript is empty' }, { status: 400 })
    }

    const userMessage = [
      callerName ? `Caller Name: ${callerName}` : '',
      `Course Enquiry: ${course || 'Not specified'}`,
      '',
      'Transcript:',
      transcript,
    ]
      .filter(Boolean)
      .join('\n')

    const message = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1200,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: userMessage }],
    })

    const block = message.content[0]
    if (block.type !== 'text') {
      throw new Error('Unexpected content type from Claude')
    }

    // Strip any accidental markdown fences before parsing
    const raw = block.text.replace(/^```json?\s*/i, '').replace(/\s*```$/i, '').trim()
    const review = JSON.parse(raw)

    return NextResponse.json(review)
  } catch (err) {
    console.error('Review route error:', err)
    return NextResponse.json({ error: 'Analysis failed. Please try again.' }, { status: 500 })
  }
}
