# ReelToReal

**Turn saved Reels into real plans.** ReelToReal turns short-form videos into a searchable personal memory, then creates plans from what the user has saved.

## Problem

People save hundreds of useful Reels and Shorts—restaurants, trips, recipes, workouts—and rarely find or use them again.

## Solution

ReelToReal follows: **Save → Understand → Remember → Retrieve → Plan**. A video becomes structured knowledge (transcript, visual insights, tags, entities and category), which is retrieved as the primary source for a natural-language plan.

## Features

- Upload MP4, MOV, or WebM videos (up to 100 MB), or save a video URL
- Non-blocking, visible processing experience
- Structured multimodal-style analysis: transcript, visual description, summary, category, tags, entities, locations, foods and actions
- MongoDB-backed library when configured, with a resilient in-memory fallback for demos
- Local semantic embedding and cosine retrieval fallback
- Personal planner that shows exactly which saved memories informed every recommendation
- Responsive Home, Library, Add Video, Processing, Detail and Planner views
- Optional demo data: restaurant, café, travel, recipe and workout memories

## Architecture

```text
React/Vite UI → Express API → ingestion → understanding service
                                      ↓
                     structured video memory + embedding
                                      ↓
                         MongoDB (or local demo store)
                                      ↓
                     semantic retrieval → source-grounded plan
```

For uploaded video files, the processor extracts five representative frames with bundled FFmpeg, transcribes the audio with OpenAI, and sends the transcript plus frames to a vision-capable model for structured extraction. Services remain isolated so providers can be swapped without changing routes or UI.

## Setup

1. Copy `.env.example` to `.env` and adjust values. `DEMO_MODE=true` works without external credentials.
2. Install dependencies:

   ```bash
   npm install
   ```

3. Seed the demonstration library (optional):

   ```bash
   npm run seed
   ```

4. Start client and server:

   ```bash
   npm run dev
   ```

   Open `http://localhost:5173`.

### MongoDB Atlas

Create a free Atlas cluster, create a database user, add your IP to Network Access, and set `MONGODB_URI` in `.env`. The app falls back to in-memory records if the connection is unavailable; this prevents a failed external dependency from breaking the demo.

### AI and FFmpeg

Set `OPENAI_API_KEY`. FFmpeg is included through `ffmpeg-static` after `npm install`, so a separate system installation is not required. URL entries are saved as links, but are not downloaded from Instagram or YouTube; upload the actual video file for analysis.

## Demo flow

1. Run `npm run seed`, or upload `chinese-restaurant.mp4` (the filename steers the offline demo classifier).
2. Open **Plan** and ask: “Plan my evening. I want Chinese food and something casual afterward.”
3. ReelToReal retrieves the Chinese restaurant and café memories, creates a timeline, and shows source cards.

## API

- `POST /api/videos/upload`
- `POST /api/videos/url`
- `GET /api/videos`, `GET /api/videos/:id`, `DELETE /api/videos/:id`
- `POST /api/videos/:id/process`
- `POST /api/planner/query`
- `GET /api/categories`

## Future scope

Calendar and location integration, true video downloading for approved platforms, live multimodal AI providers, Atlas Vector Search, budget-aware plans, preference learning, trip planning and reminders.

## Pitch

Every day we save Reels we never use again. ReelToReal uses multimodal AI to understand saved content, turns it into personal memory, and lets you ask what to do next. **Saved content → personal memory → real-world action.**
