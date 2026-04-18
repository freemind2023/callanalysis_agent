# PES Call Quality Reviewer

Internal sales call quality analysis tool for **Practical Eduskills**, Pune.

Upload a counselling call recording → AI transcribes it → Claude scores it on 8 sales parameters → instant scorecard.

---

## Setup

### 1. Install dependencies

```bash
npm install
```

### 2. Add API keys

Copy `.env.local.example` to `.env.local` and fill in your keys:

```bash
cp .env.local.example .env.local
```

| Variable | Where to get it |
|---|---|
| `ANTHROPIC_API_KEY` | https://console.anthropic.com |
| `DEEPGRAM_API_KEY` | https://console.deepgram.com |

### 3. Run locally

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## How to use

1. Upload an MP3/WAV/M4A/OGG file (max 25 MB)
2. Enter the caller's name (optional) and select the course
3. Click **Analyse Call**
4. Wait ~30–60 seconds for transcription + analysis
5. View the scorecard — click **Print / Save PDF** to export

---

## Supported languages

Deepgram is configured with `language=hi` (Hindi), which handles:
- Hindi
- Marathi / Hindi mix (common in Pune)
- English

If Marathi is detected, a **"Marathi Call ✓"** badge appears on the scorecard.

---

## Deploy to Vercel

```bash
npm install -g vercel
vercel
```

Add environment variables in **Vercel → Project → Settings → Environment Variables**.

> **Note on file size:** Vercel Hobby plan limits serverless function request bodies to **4.5 MB**.  
> For larger audio files on Vercel, upgrade to Pro, or use [Vercel Blob](https://vercel.com/docs/storage/vercel-blob) to store the file and pass the URL to Deepgram.  
> Local development supports the full 25 MB limit.

---

## Tech stack

- [Next.js 14](https://nextjs.org/) (App Router)
- [Tailwind CSS](https://tailwindcss.com/)
- [Deepgram](https://deepgram.com/) — Hindi/Marathi transcription with speaker diarization
- [Anthropic Claude](https://anthropic.com/) — sales quality scoring
