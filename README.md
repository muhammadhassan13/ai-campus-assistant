\`\`\`markdown

\# AI Campus Assistant

An intelligent campus query platform with document understanding, conversational AI, voice interaction, and a visual document inspector.

\## Table of Contents

\- \[What It Does\](#what-it-does)

\- \[Who This Is For\](#who-this-is-for)

\- \[Tech Stack\](#tech-stack)

\- \[Quick Start\](#quick-start)

\- \[Project Structure\](#project-structure)

\- \[Architecture Overview\](#architecture-overview)

\- \[Features\](#features)

\- \[Documentation Index\](#documentation-index)

\- \[Common Commands\](#common-commands)

\- \[Troubleshooting\](#troubleshooting)

\- \[Glossary\](#glossary)

\- \[License\](#license)

\## What It Does

The system has four main features:

1\. \*\*Documents Hub\*\* — Upload PDFs, extract their text and structure, generate vector embeddings, and prepare them for AI queries.

2\. \*\*General AI Chat\*\* — A conversational assistant for coursework, coding, and general questions.

3\. \*\*RAG & Voice Chat\*\* — Ask questions about your uploaded documents. Supports both typed and voice input, and reads answers aloud.

4\. \*\*Visual Inspector\*\* — Side-by-side view of a PDF and its extracted structure, with hover-to-locate highlighting.

\## Who This Is For

\- \*\*Students\*\*: Ask questions about lecture notes, textbooks, and course materials.

\- \*\*Faculty\*\*: Build a searchable knowledge base from PDFs.

\- \*\*Developers\*\*: Extend the AI pipeline, add document types, integrate new models.

\## Tech Stack

| Layer | Technology |

| --- | --- |

| Backend | Node.js, Express, TypeScript |

| Structured data | PostgreSQL |

| Document storage | MongoDB |

| PDF parsing | LlamaParse + pdfjs |

| Embeddings | Xenova Transformers (local, 384-dim) |

| Chat models | Groq (Llama) + Google Gemini |

| Voice | Groq Whisper (STT), browser SpeechSynthesis (TTS) |

| Frontend | React, Vite, TypeScript |

\## Quick Start

\### Prerequisites

\- Node.js 20 or newer

\- PostgreSQL (running locally or in the cloud)

\- MongoDB Atlas account (free tier works)

\- Groq API key — https://console.groq.com

\- LlamaCloud API key — https://cloud.llamaindex.ai

\- Google Gemini API key — https://aistudio.google.com

\### Setup

1\. Clone and install:

\`\`\`bash

git clone

cd ai-campus-assistant

npm install

cd client && npm install && cd ..

\`\`\`

2\. Create \`.env\` in the project root:

\`\`\`env

PORT=3001

JWT\_SECRET=replace-with-a-long-random-string

\# PostgreSQL

PGHOST=localhost

PGPORT=5432

PGUSER=postgres

PGPASSWORD=your-password

PGDATABASE=student\_db

\# MongoDB Atlas

MONGO\_URI=mongodb+srv://user:pass@cluster.mongodb.net/dbname

\# AI providers

GROQ\_API\_KEY=gsk\_...

GROQ\_MODEL=meta-llama/llama-4-scout-17b-16e-instruct

GEMINI\_API\_KEY=...

LLAMA\_CLOUD\_API\_KEY=llx-...

\`\`\`

3\. Initialize the database:

\`\`\`bash

npm run migrate

npm run seed

\`\`\`

4\. Start everything (two terminals):

\`\`\`bash

\# Terminal 1 — backend

npm run dev

\# Terminal 2 — frontend

cd client

npm run dev

\`\`\`

5\. Open http://localhost:5173

Default login: \`hassan.naeem@student.campus.edu\` / \`Password123\`

\## Project Structure

\`\`\`

src/ Backend source

app.ts Express app setup

server.ts Server entry point (starts MongoDB + HTTP)

config/ DB connections, prompts, DNS

controllers/ HTTP request handlers

middleware/ Auth, error, rate limiting

models/ Mongoose schemas

repositories/ Data access layer

routes/ API endpoints

services/ Business logic

utils/ Embeddings, chunking, vectors

client/ Frontend source

src/

App.tsx Main app with all 4 tabs

PdfComparator.tsx Visual inspector (PDF + markdown side-by-side)

main.tsx React entry

sql/ PostgreSQL schema

docs/ Additional documentation

uploads/ Runtime file storage (PDFs, markdown, audio)

\`\`\`

\## Architecture Overview

\`\`\`

┌──────────────┐

│ Browser │

│ React UI │

└──────┬───────┘

│ HTTP

▼

┌──────────────┐ ┌──────────────┐

│ Express API │───────►│ PostgreSQL │ Students, conversations

└──────┬───────┘ └──────────────┘

│

├───────────────► ┌──────────────┐

│ │ MongoDB │ Documents, chunks, blocks

│ └──────────────┘

│

├───────────────► ┌──────────────┐

│ │ LlamaParse │ PDF → structured JSON

│ └──────────────┘

│

├───────────────► ┌──────────────┐

│ │ Groq │ Chat + Whisper STT

│ └──────────────┘

│

└───────────────► ┌──────────────┐

│ Xenova │ Local embeddings

└──────────────┘

\`\`\`

\## Features

\### 1. Documents Hub

\*\*Where to find it:\*\* First tab in the top navigation.

\*\*What it does:\*\* Lets you upload PDF files and prepare them for AI queries.

\*\*Typical workflow:\*\*

1\. Click \*\*Choose PDF Document\*\* and select a file.

2\. Click \*\*Upload File\*\*.

3\. Once uploaded, the document shows as "Staged (Unchunked)."

4\. Click \*\*Ingest Vectors\*\* to process it. This sends the PDF to a parsing service, extracts text, tables, and layout information, breaks the content into small searchable pieces ("chunks"), converts each chunk into a mathematical fingerprint ("embedding"), and saves everything for later retrieval.

5\. The document now shows as "Ingested" and can be queried.

\*\*What the buttons do:\*\*

| Button | What happens |

| --- | --- |

| \*\*Ingest Vectors\*\* | Processes the document — takes 30 seconds to several minutes |

| \*\*Preview Chunks\*\* | Shows how the document was split into searchable pieces |

| \*\*Purge Vectors\*\* | Removes the embeddings but keeps the original PDF |

| \*\*Delete\*\* | Removes the PDF, its parsed data, and all embeddings permanently |

\### 2. General AI Chat

\*\*Where to find it:\*\* Second tab.

\*\*What it does:\*\* A conversational assistant you can talk to about anything — coursework, coding, writing, explanations.

\*\*Features:\*\*

\- Multi-turn memory: the assistant remembers the last few messages so follow-up questions work naturally.

\- Markdown rendering: responses can include headings, lists, tables, code blocks, and math formulas.

\- Voice input: click the microphone icon to speak instead of type.

\- Read-aloud: click the play button on any response to hear it spoken.

\- Rate limited: to prevent abuse, requests are limited to 5 per minute per user.

\### 3. RAG & Voice Chat

\*\*Where to find it:\*\* Third tab.

\*\*What it does:\*\* Answers questions using ONLY your uploaded documents, and cites its sources.

\*\*RAG stands for Retrieval-Augmented Generation:\*\*

1\. Your question is converted into an embedding.

2\. The system finds the most similar chunks in your documents.

3\. Those chunks are sent to the AI along with your question.

4\. The AI answers using only those chunks as its source of truth.

\*\*Features:\*\*

\- Document scoping: select specific documents to query, or search across all.

\- Voice mode: speak your question, hear the answer.

\- Source citations: every fact in the answer points back to a specific chunk.

\*\*Why use this instead of general chat?\*\* Because the general model may hallucinate. RAG grounds every answer in real text from your files.

\### 4. Visual Inspector

\*\*Where to find it:\*\* Fourth tab.

\*\*What it does:\*\* Opens a new window showing a PDF side-by-side with its extracted structure.

\*\*The two panes:\*\*

| Left | Right |

| --- | --- |

| Original PDF rendered as an image | Extracted text as structured Markdown |

\*\*The hover-to-locate:\*\*

\- Hover any text block in the right pane.

\- The corresponding region in the PDF lights up on the left.

\*\*Warning tags:\*\*

\- Most blocks show no warning. Hovering them draws a yellow rectangle at the exact PDF location.

\- Some blocks show \*\*"⚠ approximate"\*\*. This means the parsing service returned a bounding box that can't be trusted — usually because the block spans multiple text columns. Hovering these shows a blue rectangle pointing at the nearest reliable block instead.

\*\*Why some blocks are approximate:\*\* The parser uses a vision model to identify text regions. On documents with multiple columns (like medical leaflets or academic papers), the model sometimes merges physically adjacent regions into one large box. This is a parser limitation, not an app bug.

\### 5. Voice Features

Available in both chat tabs.

\- Speech-to-text: the microphone button records your voice, sends it to a transcription service, and inserts the resulting text into the input box.

\- Text-to-speech: every AI response has a play button. Click it to hear the response read aloud in a British-accented voice.

\- Progress bar: you can scrub through playback, pause, and resume.

\### 6. Search & Retrieval

Behind the scenes, the RAG chat uses vector similarity search.

\*\*Simple explanation:\*\*

\- Every chunk of text is converted into a list of 384 numbers — a "vector".

\- Two chunks with similar meaning have similar vectors.

\- To answer a question, we compute the vector for the question and find the closest chunks.

\- Those chunks are the "context" passed to the AI.

\*\*What this means in practice:\*\* The system finds content that's semantically similar, not just word-matched. Asking "What is the dose for adults?" will find a chunk that says "Recommended Dosage in Adult Patients" even though the words differ.

\### 7. Authentication

Users sign in with an email and password. After login:

\- A JWT token is stored in the browser.

\- Every API request includes this token.

\- Tokens expire after 24 hours.

\- Users can only modify their own account.

\### 8. What's NOT Included

For transparency:

\- No multi-user document sharing: documents are per-session, not shared between users.

\- No document editing: once uploaded, documents are read-only.

\- No OCR for handwritten text: printed text only.

\- No multi-language chat: the AI responds in English.

\- No mobile app: web only.

\## Documentation Index

\- \[docs/ARCHITECTURE.md\](docs/ARCHITECTURE.md) — How the pieces fit together

\- \[docs/FEATURES.md\](docs/FEATURES.md) — What each feature does, for non-developers

\- \[docs/GLOSSARY.md\](docs/GLOSSARY.md) — Terms like RAG, embeddings, bounding box

\- \[docs/DEVELOPMENT.md\](docs/DEVELOPMENT.md) — Coding conventions, adding features

\- \[docs/TROUBLESHOOTING.md\](docs/TROUBLESHOOTING.md) — Common issues and fixes

\## Common Commands

| Command | Purpose |

| --- | --- |

| \`npm run dev\` | Start backend with hot reload |

| \`npm run build\` | Compile TypeScript to \`dist/\` |

| \`npm start\` | Run compiled backend |

| \`npm run migrate\` | Reset PostgreSQL schema |

| \`npm run seed\` | Insert test students |

| \`cd client && npm run dev\` | Start frontend dev server |

| \`cd client && npm run build\` | Build production frontend |

\## Troubleshooting

\### "Failed to connect to MongoDB"

\*\*Cause:\*\* MongoDB Atlas isn't accepting the connection.

\*\*Check:\*\*

1\. Is \`MONGO\_URI\` correct in \`.env\`?

2\. Is your current public IP in the Atlas Network Access whitelist?

\- Check: \`curl https://api.ipify.org\`

\- Add: https://cloud.mongodb.com → Network Access → Add IP

3\. For corporate networks, your DNS may be returning wrong IPs.

\*\*Workaround:\*\* Add host overrides to \`C:\\Windows\\System32\\drivers\\etc\\hosts\`:

\`\`\`

52.x.x.x ac-\-shard-00-00..mongodb.net

52.x.x.x ac-\-shard-00-01..mongodb.net

52.x.x.x ac-\-shard-00-02..mongodb.net

\`\`\`

Get correct IPs via \`nslookup 8.8.8.8\`.

\### "getaddrinfo ENOTFOUND api.cloud.llamaindex.ai"

\*\*Cause:\*\* DNS resolution failure for LlamaParse.

\*\*Check:\*\* \`nslookup api.cloud.llamaindex.ai 8.8.8.8\`

\*\*Fix:\*\* Same as above — add host entry for \`api.cloud.llamaindex.ai\` with the resolved IP.

\### "Ingest Vectors does nothing"

\*\*Symptom:\*\* Click, brief pause, doc still shows "Staged."

\*\*Cause:\*\* The parse returned 0 chunks.

\*\*Check backend terminal for:\*\*

\`\`\`

\[LlamaParse\] markdown length = ...

\[LlamaParse\] produced chunks: ...

\`\`\`

If \`markdown length = 0\` and \`blocks = 0\`, the parser returned nothing.

\*\*Fix:\*\* Check the LlamaParse response shape. Modern versions don't return a top-level \`markdown\` field — the backend reconstructs it from blocks.

\### "Visual Inspector shows blank right pane"

\*\*Cause:\*\* The document was ingested before the current schema added the \`blocks\` field.

\*\*Fix:\*\* Delete the document and re-upload.

\### "Right pane shows text, left pane shows no highlight"

\*\*Cause:\*\* The block's bounding box is unreliable (too large or too small).

\*\*Behavior:\*\* The block gets an "⚠ approximate" tag and hover shows a blue rectangle pointing at the nearest reliable block.

\*\*This is by design.\*\* The parser returned a bad bbox; we're honest about it.

\### "Upload failed. 502 Bad Gateway"

\*\*Cause:\*\* The backend crashed or is unreachable.

\*\*Check backend terminal\*\* for the crash reason.

\*\*Common causes:\*\*

\- LlamaParse rejected a parameter (check for \`Unknown field:\` in the error)

\- Timeout during parsing (increase \`timeoutMs\` in \`app.ts\`)

\- The API key is invalid or expired

\### "Login fails"

\*\*Check:\*\*

1\. Is the student seeded? Run \`npm run seed\`.

2\. Is the email exactly \`hassan.naeem@student.campus.edu\`?

3\. Is the password \`Password123\`?

4\. Is PostgreSQL running?

\### "Voice transcription doesn't work"

\*\*Check:\*\*

1\. Browser permissions — the mic icon should be visible and clickable.

2\. Is \`GROQ\_API\_KEY\` valid? Whisper runs on Groq.

3\. Is the audio file under Groq's size limit? (25 MB)

\### "AI responses are outdated"

\*\*Cause:\*\* LLM training data has a cutoff. Llama 4 Scout cuts off around August 2024.

\*\*Fix options:\*\*

1\. Switch to a newer model when available.

2\. Add web search as a tool (not currently implemented).

3\. For document-specific questions, use the RAG chat instead — it grounds answers in your files.

\### "Server won't start"

\*\*Check:\*\*

1\. Port 3001 already in use? \`netstat -ano | findstr :3001\`

2\. Is \`.env\` present and complete?

3\. Does \`npm run build\` succeed? (TypeScript errors block startup)

\## Glossary

\### AI Terms

\*\*Chunk\*\* — A small piece of a document, usually 300 to 500 characters. Documents are split into chunks because AI models have limited input size, and because retrieval works better with small units.

\*\*Embedding\*\* — A list of numbers that represents the "meaning" of a piece of text. Two texts with similar meanings have similar embeddings. Our embeddings have 384 numbers.

\*\*Vector search\*\* — Finding chunks whose embeddings are closest to a query embedding. "Closest" is measured by cosine similarity.

\*\*Cosine similarity\*\* — A number between -1 and 1 that measures the angle between two vectors. 1 means identical, 0 means unrelated.

\*\*RAG (Retrieval-Augmented Generation)\*\* — A technique that combines search with AI generation. Instead of asking the AI to answer from memory, we first find relevant chunks, then ask the AI to answer using only those chunks. This reduces hallucinations.

\*\*Hallucination\*\* — When an AI confidently states something false. RAG reduces this by grounding answers in real text.

\*\*Prompt\*\* — The text sent to an AI model. Includes the system prompt (instructions) and user input.

\*\*System prompt\*\* — Special instructions that set the AI's persona and behavior.

\*\*Few-shot examples\*\* — Example user/assistant exchanges included in the prompt to show the AI how to respond.

\*\*Token\*\* — A small unit of text, roughly ¾ of a word.

\*\*Temperature\*\* — A number controlling randomness. Low = deterministic, high = creative. We use 0.1 for RAG and 0.7 for chat.

\### Document Parsing Terms

\*\*Bounding box (bbox)\*\* — A rectangle on a page expressed as \`{ x, y, width, height }\`. Used to locate a text block visually.

\*\*Block\*\* — A unit of extracted content (paragraph, heading, or table) with its own bounding box.

\*\*LlamaParse\*\* — A cloud service that converts PDFs into structured data. Handles OCR, table extraction, and layout analysis.

\*\*Premium mode\*\* — A LlamaParse setting that uses vision models for better layout understanding. Trade-off: more accurate but sometimes merges multi-column regions.

\*\*Auto mode\*\* — A LlamaParse setting that picks per-page strategies automatically. Often better for multi-column documents.

\*\*OCR (Optical Character Recognition)\*\* — Converting images of text into actual text characters. Needed for scanned PDFs.

\*\*Layout-aware bounding box\*\* — An alternative bbox field that provides per-column rectangles for blocks that span multiple columns.

\### Web Development Terms

\*\*API endpoint\*\* — A URL that the frontend calls to get data.

\*\*Controller\*\* — A function that handles an HTTP request.

\*\*Service\*\* — A function that implements business logic. Doesn't know about HTTP.

\*\*Repository\*\* — A function that queries the database.

\*\*Middleware\*\* — Code that runs between receiving a request and calling the handler.

\*\*JWT (JSON Web Token)\*\* — A signed string the server issues on login. The client sends it back on every request to prove identity.

\*\*CORS (Cross-Origin Resource Sharing)\*\* — A browser security policy.

\*\*Vite\*\* — A build tool and dev server for React apps.

\*\*Mongoose\*\* — A library for talking to MongoDB.

\*\*pg (node-postgres)\*\* — A library for talking to PostgreSQL.

\### MongoDB Terms

\*\*Document\*\* — A single record in MongoDB. Stored as JSON-like objects.

\*\*Collection\*\* — A group of documents, similar to a table in SQL.

\*\*Schema\*\* — A definition of what fields a document can have and their types.

\*\*ObjectId\*\* — A unique identifier MongoDB generates for every document.

\### Async & Concurrency Terms

\*\*Promise\*\* — A value that will be available in the future.

\*\*async/await\*\* — Syntax for writing Promise-based code as if it were synchronous.

\*\*requestAnimationFrame (rAF)\*\* — A browser API that runs a function before the next repaint. Used to throttle expensive updates.

\*\*Debounce\*\* — Delaying an action until input has stopped.

\*\*Throttle\*\* — Limiting how often an action can run.

\### Visual Terms

\*\*Overlay\*\* — An HTML element layered on top of another.

\*\*Canvas\*\* — An HTML element that renders 2D graphics.

\*\*Scale factor\*\* — The ratio between rendered size and source size.

\## License

ISC

\`\`\`
