import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  const webhookUrl = process.env.GOOGLE_SHEETS_WEBHOOK_URL
  if (!webhookUrl) {
    return NextResponse.json({ skipped: true })
  }

  try {
    const body = await req.json()
    const res = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    const data = await res.json()
    return NextResponse.json(data)
  } catch (err) {
    console.error('Google Sheets save error:', err)
    // Non-fatal — don't break the user flow
    return NextResponse.json({ error: 'Failed to save to sheets' }, { status: 200 })
  }
}
