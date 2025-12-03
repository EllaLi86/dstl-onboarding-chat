from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel
from sqlmodel import Field, Relationship, SQLModel


class ConversationBase(SQLModel):
    title: str = Field(default="New Conversation")
    created_at: datetime = Field(default_factory=datetime.utcnow)


class Conversation(ConversationBase, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    messages: List["Message"] = Relationship(back_populates="conversation")


class MessageBase(SQLModel):
    content: str
    role: str = Field(default="user")  # "user" or "assistant"
    created_at: datetime = Field(default_factory=datetime.utcnow)
    conversation_id: int = Field(foreign_key="conversation.id")


class Message(MessageBase, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    conversation: Optional[Conversation] = Relationship(back_populates="messages")


# Pydantic models for API requests/responses
class ConversationCreate(BaseModel):
    title: str = "New Conversation"


class MessageCreate(BaseModel):
    content: str
    role: str = "user"
    conversation_id: Optional[int] = None
