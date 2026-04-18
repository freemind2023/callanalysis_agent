import { NextRequest, NextResponse } from 'next/server'

export const maxDuration = 60

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const file = formData.get('audio') as File | null

    if (!file) {
      return NextResponse.json({ error: 'No audio file provided' }, { status: 400 })
    }

    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    const mimeType = file.type || 'audio/mpeg'

    const response = await fetch(
      'https://api.deepgram.com/v1/listen?model=nova-2&language=hi&diarize=true&punctuate=true&smart_format=true',
      {
        method: 'POST',
        headers: {
          Authorization: `Token ${process.env.DEEPGRAM_API_KEY}`,
          'Content-Type': mimeType,
        },
        body: buffer,
      }
    )

    if (!response.ok) {
      const errText = await response.text()
      console.error('Deepgram error:', errText)
      return NextResponse.json({ error: `Transcription service error: ${response.status}` }, { status: 502 })
    }

    const data = await response.json()

    const transcript: string =
      data.results?.channels?.[0]?.alternatives?.[0]?.transcript ?? ''

    const utterances: Array<{ speaker: number; transcript: string; start: number; end: number }> =
      (data.results?.utterances ?? []).map(
        (u: { speaker: number; transcript: string; start: number; end: number }) => ({
          speaker: u.speaker,
          transcript: u.transcript,
          start: u.start,
          end: u.end,
        })
      )

    return NextResponse.json({ transcript, utterances })
  } catch (err) {
    console.error('Transcribe route error:', err)
    return NextResponse.json({ error: 'Transcription failed. Please try again.' }, { status: 500 })
  }
}
