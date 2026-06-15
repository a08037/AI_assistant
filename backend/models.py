from pydantic import BaseModel, Field
from typing import List, Literal

Role = Literal["system", "user", "assistant"]

class Message(BaseModel):
    role: Role
    content: str

class ChatRef(BaseModel):
    id: str
    title: str

class ChatCreate(BaseModel):
    title: str = Field(min_length=1)

class ChatPatch(BaseModel):
    title: str = Field(min_length=1)

class ChatRequest(BaseModel):
    chat_id: str
    user_message: str
    model: str = "gpt-4o-mini"
    system_prompt: str = ""

class Error(BaseModel):
    error: str
