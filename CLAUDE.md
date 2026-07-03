# Prelegal Project

## Overview

This is a SaaS product to allow users to draft legal agreements based on templates in the templates directory.
The user can carry out AI chat in order to establish what document they want and how to fill in the fields.
The available documents are covered in the catalog.json file in the project root, included here:

@catalog.json

Only the Mutual NDA is currently implemented, via a filled-in form (not AI chat yet). There is no AI chat, real authentication, or document persistence yet — see "Implementation status" below.

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

**Done (KAN-6, technical foundation):**
- FastAPI backend in `backend/` (uv project), with a SQLite `users` table dropped and recreated on every startup. No auth logic uses it yet — `GET /api/health` is the only endpoint.
- Docker image running the backend (`uvicorn`, :8000) and the frontend (`next start`, :3000) as two processes; `templates/` is copied into the image so the NDA generator can read it at runtime.
- `scripts/start-*` / `scripts/stop-*` for Mac, Linux, Windows.
- A fake login screen (`frontend/components/AuthGate.tsx` + `LoginScreen.tsx`): any credentials pass, state is kept in `localStorage` only, nothing is sent to the backend or written to the users table.

**Not built yet:**
- Real authentication (sign up / sign in against the users table).
- AI chat for document selection and field-filling.
- Any document type beyond the Mutual NDA (still a filled-in form, not AI-driven).
- Document persistence/storage.

