from contextlib import asynccontextmanager
from typing import List

from fastapi import Depends, FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlmodel import Session, select

from .database import create_db_and_tables, get_session, seed_db
from .models import Conversation, ConversationCreate, Message, MessageCreate

# Import the LLM function
try:
    from .llm import generate_llm_response

    LLM_AVAILABLE = True
except ImportError:
    print("Warning: llm.py not found. LLM functionality will be disabled.")
    LLM_AVAILABLE = False

    # Create a dummy function for when LLM is not available
    def generate_llm_response(messages, model="gemma3"):
        return "LLM integration not configured. Please check llm.py file."


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


@app.post("/messages/", response_model=Message)
async def create_message(
    message: MessageCreate, session: Session = Depends(get_session)
):
    conversation_id = message.conversation_id

    # If no conversation_id is provided, create a new conversation first
    if not conversation_id:
        # Create new conversation
        conversation = Conversation(title="Conversation")
        session.add(conversation)
        session.commit()
        session.refresh(conversation)
        conversation_id = conversation.id

    # Check if conversation exists
    conversation = session.get(Conversation, conversation_id)
    if not conversation:
        raise HTTPException(status_code=404, detail="Conversation not found")

    # Step 1: Save the user message
    user_message = Message(
        content=message.content,
        role=message.role or "user",
        conversation_id=conversation_id,
    )
    session.add(user_message)
    session.commit()
    session.refresh(user_message)

    # Step 2: Get conversation history for LLM (including the user message we just saved)
    all_messages = session.exec(
        select(Message)
        .where(Message.conversation_id == conversation_id)
        .order_by(Message.created_at)
    ).all()

    # Format messages for LLM API
    llm_messages = []
    for msg in all_messages:
        llm_messages.append({"role": msg.role, "content": msg.content})

    # Step 3: Generate AI response using LLM
    try:
        if LLM_AVAILABLE:
            ai_response_content = generate_llm_response(llm_messages)
        else:
            ai_response_content = (
                "LLM is not configured. Please check your llm.py file and NRP_API_KEY."
            )
    except Exception as e:
        # If LLM fails, provide a helpful error message
        print(f"LLM Error: {e}")
        ai_response_content = f"I apologize, but I encountered an error while generating a response. Error: {str(e)[:100]}"

    # Step 4: Save AI response to database
    ai_message = Message(
        content=ai_response_content,
        role="assistant",
        conversation_id=conversation_id,
    )
    session.add(ai_message)
    session.commit()
    session.refresh(ai_message)

    # Return the AI message (frontend already shows user message from its own state)
    return ai_message


@app.get("/conversations/{conversation_id}/messages/")
async def get_messages(conversation_id: int, session: Session = Depends(get_session)):
    messages = session.exec(
        select(Message)
        .where(Message.conversation_id == conversation_id)
        .order_by(Message.created_at)
    ).all()
    return messages


@app.post("/conversations/", response_model=Conversation)
def create_conversation(
    conversation: ConversationCreate,
    session: Session = Depends(get_session),
):
    db_conversation = Conversation(title=conversation.title or "Conversation")

    session.add(db_conversation)
    session.commit()
    session.refresh(db_conversation)
    return db_conversation


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


@app.delete("/conversations/{conversation_id}")
def delete_conversation(conversation_id: int, session: Session = Depends(get_session)):
    conversation = session.get(Conversation, conversation_id)
    if not conversation:
        raise HTTPException(status_code=404, detail="Conversation not found")
    session.delete(conversation)
    session.commit()
    return {"ok": True}
