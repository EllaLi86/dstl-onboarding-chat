from contextlib import asynccontextmanager
from typing import List

from fastapi import Depends, FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from sqlmodel import Session, select

from .database import create_db_and_tables, get_session, seed_db
from .llm import generate_llm_response
from .models import Conversation, Message


@asynccontextmanager
async def lifespan(app: FastAPI):
    create_db_and_tables()
    seed_db()
    yield


app = FastAPI(lifespan=lifespan)


app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.post("/conversations/", response_model=Conversation)
def create_conversation(
    conversation: Conversation, session: Session = Depends(get_session)
):
    session.add(conversation)
    session.commit()
    session.refresh(conversation)
    return conversation


@app.get("/conversations/", response_model=List[Conversation])
def read_conversations(
    offset: int = 0, limit: int = 100, session: Session = Depends(get_session)
):
    conversations = session.exec(select(Conversation).offset(offset).limit(limit)).all()
    return conversations


@app.get("/conversations/{conversation_id}", response_model=Conversation)
def read_conversation(conversation_id: int, session: Session = Depends(get_session)):
    conversation = session.get(Conversation, conversation_id)
    if not conversation:
        raise HTTPException(status_code=404, detail="Conversation not found")
    return conversation


@app.get("/conversations/{conversation_id}/messages")
def get_messages(
    conversation_id: int,
    session: Session = Depends(get_session),
):
    return session.exec(
        select(Message).where(Message.conversation_id == conversation_id)
    ).all()


@app.delete("/conversations/{conversation_id}")
def delete_conversation(conversation_id: int, session: Session = Depends(get_session)):
    conversation = session.get(Conversation, conversation_id)
    if not conversation:
        raise HTTPException(status_code=404, detail="Conversation not found")
    session.delete(conversation)
    session.commit()
    return {"ok": True}


class MessageRequest(BaseModel):
    content: str


@app.post("/conversations/{conversation_id}/messages", response_model=Message)
def send_message(
    conversation_id: int,
    message_request: MessageRequest,  # Accept JSON body
    session: Session = Depends(get_session),
):
    content = message_request.content  # Extract from JSON

    conversation = session.get(Conversation, conversation_id)
    if not conversation:
        raise HTTPException(status_code=404, detail="Conversation not found")

    user_message = Message(
        role="user",
        content=content,
        conversation_id=conversation_id,
    )
    session.add(user_message)
    session.commit()

    messages = session.exec(
        select(Message)
        .where(Message.conversation_id == conversation_id)
        .order_by(Message.created_at)
    ).all()

    llm_messages = [{"role": msg.role, "content": msg.content} for msg in messages]

    assistant_content = generate_llm_response(llm_messages)

    assistant_message = Message(
        role="assistant",
        content=assistant_content,
        conversation_id=conversation_id,
    )
    session.add(assistant_message)
    session.commit()
    session.refresh(assistant_message)

    return assistant_message
