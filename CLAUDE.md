# Prelegal Project

## Overview

This is a SaaS product to allow users to draft legal agreements based on templates in the templates directory.
The user can carry out AI chat in order to establish what document they want and how to fill in the fields.
The available documents are covered in the catalog.json file in the project root, included here:

@catalog.json

AI chat now covers all 11 document types in the catalog (not just Mutual NDA), including a routing step that asks what document the user wants and offers the closest supported match if they ask for something unsupported. Real sign up/sign in and per-user document history are now in place — see "Implementation status" below.

## Development process

When instructed to build a feature:
1. Use your Atlassian tools to read the feature instructions from Jira
2. Develop the feature - do not skip any step from the feature-dev 7 step process
3. Thoroughly test the feature with unit tests and integration tests and fix any issues
4. Submit a PR using your github tools

## AI design

When writing code to make calls to LLMs, use your Cerebras skill to use LiteLLM via OpenRouter to the `openrouter/openai/gpt-oss-120b` model with Cerebras as the inference provider. You should use Structured Outputs so that you can interpret the results and populate fields in the legal document.

There is an OPENROUTER_API_KEY in the .env file in the project root.

## Technical design

The entire project should be packaged into a Docker container.  
The backend should be in backend/ and be a uv project, using FastAPI.  
The frontend should be in frontend/  
The database should use SQLLite and be created from scratch each time the Docker container is brought up, allowing for a users table with sign up and sign in.  
The frontend is NOT statically exported — it runs as its own `next start` process inside the container (port 3000), because the NDA-generation feature uses a Next.js Server Action that needs a live Node runtime. FastAPI (port 8000) serves the backend API only.  
There should be scripts in scripts/ for:  
```bash
# Mac
scripts/start-mac.sh    # Start
scripts/stop-mac.sh     # Stop

# Linux
scripts/start-linux.sh
scripts/stop-linux.sh

# Windows
scripts/start-windows.ps1
scripts/stop-windows.ps1
```
Backend available at http://localhost:8000

## Color Scheme
- Accent Yellow: `#ecad0a`
- Blue Primary: `#209dd7`
- Purple Secondary: `#753991` (submit buttons)
- Dark Navy: `#032147` (headings)
- Gray Text: `#888888`

## Implementation status

**Done and merged to main (KAN-6, technical foundation):**
- FastAPI backend in `backend/` (uv project), with a SQLite `users` table dropped and recreated on every startup. No auth logic uses it yet.
- Docker image running the backend (`uvicorn`, :8000) and the frontend (`next start`, :3000) as two processes; multi-stage build (`Dockerfile`) so devDependencies/package caches never reach the final image, with BuildKit cache mounts for npm/uv/apt.
- `scripts/start-*` / `scripts/stop-*` for Mac, Linux, Windows.
- A fake login screen (`frontend/components/AuthGate.tsx` + `LoginScreen.tsx`): any credentials pass, state is kept in `localStorage` only, nothing is sent to the backend or written to the users table.

**Done and merged to main (KAN-7, AI chat for Mutual NDA):**
- `POST /api/chat` (`backend/app/chat.py`) replaces the old static form: a freeform conversation extracts Mutual NDA fields turn by turn using Structured Outputs, with completion computed deterministically in Python (not trusted from the model) and a guaranteed follow-up question whenever required fields are still missing.
- Frontend is a persistent split view — chat on the left, a live-updating document preview on the right that re-renders after every turn.
- LLM calls route through the `cerebras` OpenRouter provider slug specifically; this made turns ~15-20x faster (~0.3-0.5s vs. 5-8s).

**Done and merged to main (KAN-8, all 11 document types):**
- Adds a routing phase to `/api/chat`: while no document type is confirmed, the model classifies the request against all 11 catalog entries. A direct match confirms immediately; an unsupported request gets one specific closest-match suggestion that only locks in once the user agrees on a later turn.
- Only Mutual NDA has a real fillable Cover Page template. For the other 10 types (which only have `<span class="..._link">Label</span>` tags naming variables inline in their prose, no companion file), field labels are scraped from each template and a Pydantic model is built dynamically per document type — no per-document hardcoding. The frontend mirrors this with one generic renderer (`frontend/lib/genericTemplate.ts`) instead of 10 bespoke fill functions.
- Mutual NDA's KAN-7 logic and rendering are untouched. DPA gets a static note about the SCC/UK Addendum exhibits it references but can't include (no source text for those).
- The generic renderer strips every span pattern found across the 10 templates — `_link` spans (replaced with values), `header_2`/`header_3` (converted to bold text), and bare `id`-only spans used in Definitions sections (unwrapped, content kept) — plus a catch-all pass removing any remaining span tag, so malformed source markup (a stray extra `</span>` in CSA.md) can't leak into the rendered document either. Verified clean across all 11 document types.
- `catalog.json` is copied into the Docker image alongside `templates/` — the backend reads it at import time to build the routing prompt and derive document-type ids; missing it crashed the container on startup (same class of bug as the earlier missing-`templates/` issue in KAN-6).

**Done and merged to main (KAN-9, multi-user auth & polish):**
- Real sign up / sign in replaces the old fake `localStorage`-only gate: `backend/app/auth.py` hashes passwords with stdlib `hashlib.pbkdf2_hmac` (per-user random salt, no new dependency), and issues a random session token (`secrets.token_urlsafe`) stored in a new `sessions` table and set as an httpOnly cookie. `frontend/components/AuthContext.tsx` + `AuthGate.tsx` check `/api/auth/me` on load instead of reading a boolean flag.
- A new `documents` table (`backend/app/documents.py`) autosaves/upserts a row on every chat turn once a document type is confirmed, keyed by a `document_id` threaded through `ChatRequest`/`ChatTurnResponse` (`backend/app/chat.py`) — the first confirmed turn creates the row and returns its id, later turns pass that id back to update the same row. Every read and write is ownership-checked against the authenticated user (404 otherwise), including the chat-driven update path.
- New read-only "My Documents" list (`frontend/app/documents/page.tsx`) and detail view (`frontend/app/documents/[id]/page.tsx`) — reuses the existing `renderNda` Server Action and `NdaDocument` component; past documents are viewable, not resumable (no chat message history is persisted, only the confirmed field values).
- New authenticated app shell (`frontend/components/AppShell.tsx`): header with nav ("New Document" / "My Documents"), logged-in user email + logout, and a persistent footer disclaimer that generated documents are drafts subject to legal review, not legal advice.
- Minor polish: a sign-in/sign-up toggle on the login screen, a typing indicator while the assistant is replying, and a loading state (via `useTransition`) for the live document preview.

**Not built yet:**
- Password reset, email verification, and rate limiting on auth endpoints — deliberately out of scope for this prototype stage.
- Resuming a past document's chat conversation (only a read-only snapshot of the confirmed fields is stored, not the message history).
- A production fix for the CSA/other templates' singular-plural span duplication (e.g. "Subscription Period" vs "Subscription Periods" surfacing as two separate fields) — known, low-impact, not addressed.

