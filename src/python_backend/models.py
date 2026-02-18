
from pydantic import BaseModel
from typing import List, Optional, Dict, Any, Literal
from enum import Enum

class NovelType(str, Enum):
    LONG = "LONG"
    SHORT = "SHORT"

class NodeType(str, Enum):
    ROOT = 'ROOT'
    VOLUME = 'VOLUME'
    SECTION = 'SECTION'
    CHAPTER = 'CHAPTER'
    SETTING_ROOT = 'SETTING_ROOT'
    SETTING_FOLDER = 'SETTING_FOLDER'
    SETTING_ITEM = 'SETTING_ITEM'

class ChatMessage(BaseModel):
    role: str
    parts: List[Dict[str, str]]

class NodeInfo(BaseModel):
    id: str
    type: NodeType
    title: str
    summary: Optional[str] = ""
    content: Optional[str] = ""

class WritingTask(BaseModel):
    type: str # SYNOPSIS, CONTENT, POLISH_SELECTION
    node_id: str
    field: str
    context_data: Optional[str] = None

class ShortNovelState(BaseModel):
    novel_path: str
    current_node: NodeInfo
    novel_outline: str  # The content of the ROOT node
    novel_title: Optional[str] = ""
    current_node_title: Optional[str] = ""
    chapter_title: Optional[str] = ""
    active_task: Optional[WritingTask] = None

class ChatRequestShort(BaseModel):
    history: List[ChatMessage]
    message: str
    state: ShortNovelState
    config: Optional[Dict[str, Any]] = None

class ChatRequestLong(BaseModel):
    history: List[ChatMessage]
    message: str
    # Placeholder for long novel complex state
    state: Dict[str, Any] 
    config: Optional[Dict[str, Any]] = None
