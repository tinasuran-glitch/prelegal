from contextlib import asynccontextmanager

from dotenv import load_dotenv
from fastapi import Depends, FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from app.auth import AuthenticatedUser, get_current_user
from app.auth import router as auth_router
from app.chat import ChatRequest, ChatTurnResponse, run_chat_turn
from app.db import init_db
from app.documents import router as documents_router

load_dotenv()


@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    yield


app = FastAPI(title="Prelegal API", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router)
app.include_router(documents_router)


@app.get("/api/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.post("/api/chat")
def chat(request: ChatRequest, user: AuthenticatedUser = Depends(get_current_user)) -> ChatTurnResponse:
    try:
        return run_chat_turn(request, user.id)
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=502, detail="The AI assistant is unavailable right now.") from exc
