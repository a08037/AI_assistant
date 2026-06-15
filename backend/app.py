print("APP.PY LOADED")
from dotenv import load_dotenv

load_dotenv()

import os
import json
import uuid
from typing import Dict, Any, List

from fastapi import FastAPI, Request, Response, HTTPException, Query
from fastapi.responses import JSONResponse, StreamingResponse, PlainTextResponse
from starlette.middleware.sessions import SessionMiddleware
from starlette.staticfiles import StaticFiles

from models import Message, ChatRef, ChatCreate, ChatPatch, ChatRequest
from openai_client import get_openai_client, OpenAIInitError

app = FastAPI(title="Chat с GPT (один контейнер)")

DEFAULT_SYSTEM_PROMPT = """
Ты — Нейропомощник AI.

Помогаешь пользователю:
- составлять планы дня;
- создавать чек-листы;
- генерировать шаблоны документов;
- придумывать идеи проектов;
- помогать в обучении;
- структурировать информацию.

Правила:
1. Отвечай на русском языке.
2. Используй списки и пошаговые инструкции.
3. Давай практические рекомендации.
4. Если задача сложная — разбивай её на этапы.
5. В конце при необходимости предлагай улучшения результата.
"""

# --- Сессии (cookie). Ключ берём из .env ---
SESSION_SECRET = os.environ.get("SESSION_SECRET", "dev-secret-change-me")
app.add_middleware(SessionMiddleware, secret_key=SESSION_SECRET)

# --- In-memory хранилище: { sid -> { chats: { chat_id: {title, messages[]} } } } ---
STORE: Dict[str, Dict[str, Any]] = {}

def _get_sid(request: Request) -> str:
    sid = request.session.get("sid")
    if not sid:
        sid = uuid.uuid4().hex
        request.session["sid"] = sid
    if sid not in STORE:
        STORE[sid] = {"chats": {}}
    return sid

def _require_chat(sid: str, chat_id: str) -> Dict[str, Any]:
    chat = STORE[sid]["chats"].get(chat_id)
    if not chat:
        raise HTTPException(status_code=404, detail="Chat not found")
    return chat

@app.get("/healthz")
def healthz():
    return PlainTextResponse("ok")

# ----- Chats CRUD -----
@app.get("/api/v1/chats", response_model=List[ChatRef])
def get_chats(request: Request):
    sid = _get_sid(request)
    return [ChatRef(id=k, title=v["title"]) for k, v in STORE[sid]["chats"].items()]

@app.get("/api/v1/chats/{chat_id}/messages", response_model=List[Message])
def get_chat_messages(chat_id: str, request: Request):
    sid = _get_sid(request)
    chat = _require_chat(sid, chat_id)
    return chat.get("messages", [])

@app.post("/api/v1/chats", response_model=ChatRef)
def create_chat(payload: ChatCreate, request: Request):
    sid = _get_sid(request)
    chat_id = uuid.uuid4().hex
    STORE[sid]["chats"][chat_id] = {"title": payload.title, "messages": []}
    return ChatRef(id=chat_id, title=payload.title)

@app.patch("/api/v1/chats/{chat_id}", response_model=ChatRef)
def patch_chat(chat_id: str, payload: ChatPatch, request: Request):
    sid = _get_sid(request)
    chat = _require_chat(sid, chat_id)
    chat["title"] = payload.title
    return ChatRef(id=chat_id, title=payload.title)

@app.delete("/api/v1/chats/{chat_id}")
def delete_chat(chat_id: str, request: Request):
    sid = _get_sid(request)
    _require_chat(sid, chat_id)
    del STORE[sid]["chats"][chat_id]
    return Response(status_code=204)

# ----- Не-стримовый чат -----
@app.post("/api/v1/chat")
def chat(payload: ChatRequest, request: Request):
    sid = _get_sid(request)
    chat = _require_chat(sid, payload.chat_id)
    
    try:
        client = get_openai_client()
    except OpenAIInitError as e:
        raise HTTPException(status_code=400, detail=str(e))

    messages = [
    {
        "role": "system",
        "content": payload.system_prompt or DEFAULT_SYSTEM_PROMPT
    }
]
    
    # ВАЖНО: конвертировать Pydantic-объекты в dict
    messages.extend([m.model_dump() for m in chat.get("messages", [])])
    messages.append({"role": "user", "content": payload.user_message})

    try:
        completion = client.chat.completions.create(
            model=payload.model,
            messages=messages,
        )
        assistant_text = completion.choices[0].message.content or ""
    except Exception as e:
        error_msg = f"OpenAI API error: {str(e)}"
        assistant_text = f"❌ Ошибка API: {error_msg}"
        # Не сохраняем ошибку в историю, только возвращаем

    chat.setdefault("messages", []).append(Message(role="user", content=payload.user_message))
    chat["messages"].append(Message(role="assistant", content=assistant_text))

    return {"assistant": assistant_text}

# ----- SSE-стриминг: GET /api/v1/chat/stream -----
@app.get("/api/v1/chat/stream")
def chat_stream(
    request: Request,
    chat_id: str = Query(...),
    user_message: str = Query(...),
    model: str = Query("gpt-4o-mini"),
    system_prompt: str = Query("", alias="system_prompt"),
):
    sid = _get_sid(request)
    chat = _require_chat(sid, chat_id)

    messages = [
    {
        "role": "system",
        "content": system_prompt or DEFAULT_SYSTEM_PROMPT
    }
]

    messages.extend([m.model_dump() for m in chat.get("messages", [])])
    messages.append({"role": "user", "content": user_message})

    try:
        client = get_openai_client()
    except OpenAIInitError as e:
        raise HTTPException(status_code=400, detail=str(e))

    def event_gen():
        assistant_chunks = []
        try:
            # Официальный SDK: stream=True и итерируем чанки
            completion = client.chat.completions.create(
                model=model,
                messages=messages,
                stream=True,
            )

            # Сигнал фронту, что начался стрим
            yield 'data: {"status":"started"}\n\n'

            for chunk in completion:
                delta = getattr(chunk.choices[0].delta, "content", None)
                if delta:
                    assistant_chunks.append(delta)
                    yield f"data: {json.dumps({'delta': delta})}\n\n"

            # Сохраняем историю после завершения
            full_text = "".join(assistant_chunks)
            chat.setdefault("messages", []).append(Message(role="user", content=user_message))
            chat["messages"].append(Message(role="assistant", content=full_text))

            yield "data: [DONE]\n\n"

        except OpenAIInitError as e:
            error_msg = f"OpenAI API не настроен: {str(e)}"
            yield f"data: {json.dumps({'error': error_msg})}\n\n"
        except Exception as e:
            error_msg = f"OpenAI API error: {str(e)}"
            yield f"data: {json.dumps({'error': error_msg})}\n\n"

    return StreamingResponse(
        event_gen(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",  # если позже будет внешний прокси
            "Connection": "keep-alive",
        },
    )

# ----- Сброс сессии -----
@app.post("/api/v1/reset-session")
def reset_session(request: Request):
    sid = _get_sid(request)
    STORE.pop(sid, None)
    request.session["sid"] = uuid.uuid4().hex
    return {"status": "reset"}

# ----- Раздача статики (SPA) -----
STATIC_DIR = os.path.join(os.getcwd(), "frontend_dist")
if os.path.isdir(STATIC_DIR):
    app.mount("/", StaticFiles(directory=STATIC_DIR, html=True), name="static")
