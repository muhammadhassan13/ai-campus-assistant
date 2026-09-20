# Lumen — AI Campus Assistant

A full-stack campus query platform with document understanding, conversational AI, voice interaction, and a visual document inspector.

---

## Table of Contents

- [What It Does](#what-it-does)
- [Tech Stack](#tech-stack)
- [Prerequisites](#prerequisites)
- [Setup](#setup)
- [Environment Variables](#environment-variables)
- [Running the App](#running-the-app)
- [Postman Workflow](#postman-workflow)
- [Project Structure](#project-structure)
- [Common Commands](#common-commands)
- [What You Must Improvise](#what-you-must-improvise)
- [License](#license)

---

## What It Does

The system has four main features:

1. **Documents Hub** — Upload PDFs, extract their text and structure, generate vector embeddings, and prepare them for AI queries.
2. **General AI Chat** — A conversational assistant for coursework, coding, and general questions.
3. **RAG & Voice Chat** — Ask questions about your uploaded documents. Supports typed and voice input, and reads answers aloud.
4. **Visual Inspector** — Side-by-side view of a PDF and its extracted structure, with hover-to-locate highlighting.

## Tech Stack

| Layer            | Technology                                        |
| ---------------- | ------------------------------------------------- |
| Backend          | Node.js, Express, TypeScript                      |
| Structured data  | PostgreSQL                                        |
| Document storage | MongoDB Atlas                                     |
| PDF parsing      | LlamaParse (LlamaCloud) + pdfjs                   |
| Embeddings       | Xenova Transformers (local, 384-dim)              |
| Chat models      | Groq (Llama / GPT-OSS)                            |
| Voice            | Groq Whisper (STT), browser SpeechSynthesis (TTS) |
| Frontend         | React, Vite, TypeScript                           |

## Prerequisites

- **Node.js 22.13+** (required by `pdfjs-dist@6`)
- **PostgreSQL** (local or cloud)
- **MongoDB Atlas** free cluster
- **Groq API key** — https://console.groq.com
- **LlamaCloud API key** — https://cloud.llamaindex.ai

## Setup

### 1. Clone and install

```bash
git clone <repo-url>
cd ai-campus-assistant
npm install
cd client
npm install
cd ..
```

### 2. Create the database

If using a local PostgreSQL:

```bash
createdb ai_campus_assistant
```

### 3. Create the `.env` file

Copy the template in the next section to a file named `.env` at the **project root** (same folder as `package.json`).

### 4. Initialize the database

migrate and seed populate the database with dummy records.

```bash
npm run migrate
npm run seed
```

### 5. Get external API keys

- **Groq**: sign up at https://console.groq.com → API Keys → Create
- **LlamaCloud**: sign up at https://cloud.llamaindex.ai → API Keys → Create
- **MongoDB Atlas**: create a free M0 cluster, add a database user, whitelist your IP (Network Access → Add Current IP), then copy the connection string.

## Environment Variables

Place this file at the project root as `.env`:

```env
# Server
PORT=3001
JWT_SECRET=replace-with-a-long-random-string

# PostgreSQL
PGHOST=localhost
PGPORT=5432
PGUSER=postgres
PGPASSWORD=your-postgres-password
PGDATABASE=ai_campus_assistant

# MongoDB Atlas
MONGO_URI=mongodb+srv://<user>:<pass>@<cluster>.mongodb.net/?retryWrites=true&w=majority

# Groq
GROQ_API_KEY=gsk_...
GROQ_MODEL=openai/gpt-oss-120b
USE_MOCK_AI=false

# LlamaCloud
LLAMA_CLOUD_API_KEY=llx-...
```

**Generating a JWT secret:**

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

## Running the App

Two terminals.

### Terminal 1 — Backend

```bash
npm run dev
```

Expected output:

```
Connected to MongoDB successfully
Server running on http://localhost:3001
```

### Terminal 2 — Frontend

```bash
cd client
npm run dev
```

Expected output:

```
VITE ready
➜  Local:   http://localhost:5173/
```

### Open the app

Go to **http://localhost:5173** and sign in with a seeded student account.

**Default seeded credentials:**

| Email                              | Password      |
| ---------------------------------- | ------------- |
| `hassan.naeem@student.campus.edu`  | `Password123` |
| `shabih.haider@student.campus.edu` | `Password123` |

## Postman Workflow

The app has no sign-up UI. Student accounts are created via Postman or curl.

### Base URL

```
http://localhost:3001/api
```

### 1. Log in (to get a JWT)

**POST** `/students/login`

Body (JSON):

```json
{
  "email": "hassan.naeem@student.campus.edu",
  "password": "Password123"
}
```

Response:

```json
{
  "message": "Login successful",
  "token": "eyJhbGciOi...",
  "student": { "student_id": 1, "name": "Muhammad Hassan Naeem", ... }
}
```

Copy the `token` value. Use it as `Bearer <token>` in the `Authorization` header for all protected routes.

### 2. Create a new student

**POST** `/students`

Body (JSON):

```json
{
  "name": "Ali Khan",
  "email": "ali.khan@student.campus.edu",
  "password": "Password123",
  "degree": "BS Computer Science",
  "gpa": 3.5,
  "status": "Active"
}
```

**Allowed values:**

- `degree`: `BS Computer Science`, `BS Software Engineering`, `BS Data Science`, `BS Artificial Intelligence`, `Not specified`
- `status`: `Active`, `Inactive`, `Graduated`, `Suspended`

### 3. List all students

**GET** `/students`

No auth required.

### 4. Get one student

**GET** `/students/:id`

### 5. Update a student

**PUT** `/students/:id` or **PATCH** `/students/:id`

Auth: Bearer token of that same student (ownership check enforced).

### 6. Delete a student

**DELETE** `/students/:id`

Auth: Bearer token of that same student.

### 7. Delete all students

**DELETE** `/students`

Auth: any valid token. Resets the ID sequence to 1.

### 8. Upload a document

**POST** `/documents/upload`

Auth: Bearer token.

Form-data:

| Key    | Type | Value    |
| ------ | ---- | -------- |
| `file` | File | your PDF |

Response includes the `documentId` you'll use in the next step.

### 9. Chunk and embed a document

**POST** `/documents/:id/chunk`

Auth: Bearer token.

Body: `{}` (empty JSON is fine).

This sends the PDF to LlamaParse, extracts text + blocks, generates embeddings, and stores everything in MongoDB. Takes 30 seconds to several minutes.

### 10. RAG chat

**POST** `/documents/chat`

Auth: Bearer token.

Body:

```json
{
  "query": "What is the dose for adults?",
  "documentId": "<optional-document-id>",
  "topK": 3
}
```

Omit `documentId` to search across all ingested documents.

## Project Structure

```
src/                       Backend source
  app.ts                   Express app setup
  server.ts                Server entry point
  config/                  DB connections, prompts
  controllers/             HTTP request handlers
  middleware/              Auth, error, rate limiting, ownership
  models/                  Mongoose schemas
  repositories/            Data access layer
  routes/                  API endpoints
  services/                Business logic
    ai/                    AI service layer (live, mock, proxy)
  scripts/                 migrate, seed
  utils/                   Embeddings, vectors

client/                    Frontend source
  src/
    App.tsx                Main app with all 4 tabs
    PdfComparator.tsx      Visual Inspector window
    Sidebar.tsx            Navigation sidebar
    main.tsx               React entry
    theme.ts               Theme definitions
    icons.tsx              SVG icon set

sql/                       PostgreSQL schema reference
docs/                      Additional documentation
uploads/                   Runtime file storage (PDFs, markdown, audio)
```

## Common Commands

| Command                      | Purpose                       |
| ---------------------------- | ----------------------------- |
| `npm run dev`                | Start backend with hot reload |
| `npm run build`              | Compile TypeScript to `dist/` |
| `npm start`                  | Run compiled backend          |
| `npm run migrate`            | Reset PostgreSQL schema       |
| `npm run seed`               | Insert test students          |
| `cd client && npm run dev`   | Start frontend dev server     |
| `cd client && npm run build` | Build production frontend     |

## What You Must Improvise

If you're running this project on a fresh machine, these are the things that are **not** shipped with the code and must be set up by you.

### Required (the app will not run without these)

| Item                                 | Why                                                                             |
| ------------------------------------ | ------------------------------------------------------------------------------- |
| **Node.js 22.13+**                   | `pdfjs-dist@6` requires it; older versions crash on startup                     |
| **PostgreSQL instance**              | Local install or free cloud provider (Neon, Supabase)                           |
| **MongoDB Atlas cluster**            | Free M0 tier works                                                              |
| **Your IP whitelisted on Atlas**     | Without this, backend hangs ~10s then fails with `Failed to connect to MongoDB` |
| **`.env` file at project root**      | With all fields filled in (see [Environment Variables](#environment-variables)) |
| **Your Postgres password in `.env`** | The password field must match your local Postgres setup                         |

### If you received the `.env` from the project author

These fields carry over as-is — nothing to change:

- `JWT_SECRET`
- `GROQ_API_KEY`
- `GROQ_MODEL`
- `USE_MOCK_AI`
- `LLAMA_CLOUD_API_KEY`
- `MONGO_URI` (the connection string works, but **his IP must be whitelisted on the cluster's Network Access page**)
- All `PG*` fields **except** `PGPASSWORD`

These must be updated:

- `PGPASSWORD` — replace with your own Postgres password
- Your IP — added to Atlas Network Access (the author must do this from their Atlas dashboard, or you spin up your own free cluster)

### Optional (the app runs without these, degraded)

| Item                  | Behavior if missing                                                                               |
| --------------------- | ------------------------------------------------------------------------------------------------- |
| `GROQ_API_KEY`        | Set `USE_MOCK_AI=true` in `.env` to get stub responses                                            |
| `LLAMA_CLOUD_API_KEY` | Falls back to local pdfjs parsing (no OCR, no table extraction, no multi-column layout awareness) |

### Common startup errors

**`Failed to connect to MongoDB`** — Your IP isn't whitelisted. Find it at https://api.ipify.org and add it via Atlas → Network Access → Add IP Address.

**`ECONNREFUSED 127.0.0.1:5432`** — PostgreSQL isn't running, or the password in `.env` is wrong.

**`ERR_REQUIRE_ESM` on startup** — You're on Node < 22.13. Upgrade.

**Port already in use** — Something else is on 3001 or 5173. Kill it, or change `PORT` in `.env` and `client/vite.config.ts`.

## License

ISC
