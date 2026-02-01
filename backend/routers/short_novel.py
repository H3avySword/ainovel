
from fastapi import APIRouter, HTTPException
from models import ChatRequestShort, NodeType
from services.llm_service import generate_response

router = APIRouter()

@router.post("/short")
async def chat_short_novel(request: ChatRequestShort):
    state = request.state
    node = state.current_node
    
    # 1. Base System Instruction
    base_instruction = """You are an expert novel writing assistant for a Short Story.
    Your goal is to help the author consistently and creatively based on the provided context.
    """
    
    # 2. Dynamic Context Assembly
    # 2. Dynamic Context Assembly
    node_instruction = ""
    
    if node.type == NodeType.ROOT:
        node_instruction = """
        Current Focus: TOTAL OUTLINE (Novel Root)
        The user is editing the main outline of the story.
        Help with:
        - Brainstorming the core idea.
        - Refining the plot structure.
        - Defining characters.
        """
        
    elif node.type == NodeType.CHAPTER:
        node_instruction = f"""
        Current Focus: CHAPTER WRITING
        The user is working on a specific chapter.
        
        === Novel Context ===
        Total Outline:
        {state.novel_outline}
        
        === Chapter Context ===
        Chapter Title: {node.title}
        Chapter Outline (Summary):
        {node.summary}
        
        Current Chapter Content:
        {node.content}
        
        Help with:
        - Continuing the story based on the outline.
        - Polishing the prose.
        - Ensuring consistency with the Total Outline.
        """
    else:
        # Fallback for other types if any
        node_instruction = f"Current Focus: {node.type}"

    # 4. Active Task Override
    task_instruction = ""
    if state.active_task:
        task = state.active_task
        if task.type == "SYNOPSIS":
             task_instruction = """
             [IMMEDIATE ACTION REQUIRED]
             The user has requested you to GENERATE A SYNOPSIS/OUTLINE for the current node.
             - Ignore previous conversation context if it conflicts with this explicit task.
             - Analyze the Total Outline and create a compelling, structured summary for this specific part.
             - Keep it concise but covering key plot points.
             """
        elif task.type == "CONTENT":
             task_instruction = """
             [IMMEDIATE ACTION REQUIRED]
             The user has requested you to WRITE CONTENT for the current node.
             - Use the provided Node Summary as the blueprint.
             - Provide high-quality, immersive narrative text.
             - Style: Engaging, vivid, and adhering to the established tone.
             """
        elif task.type == "POLISH_SELECTION":
             task_instruction = f"""
             [IMMEDIATE ACTION REQUIRED]
             The user has requested you to POLISH the following selected text:
             
             <<START SELECTION>>
             {task.context_data}
             <<END SELECTION>>
             
             - Improve clarity, flow, and prose quality.
             - Fix grammar and punctuation.
             - Elevate the writing style while maintaining the original meaning.
             - Return ONLY the polished text without conversational filler if possible, or present it clearly.
             """

    full_system_instruction = f"{base_instruction}\n\n{node_instruction}\n\n{task_instruction}"

    # 3. Call LLM
    response_text = generate_response(
        message=request.message,
        history=request.history,
        system_instruction=full_system_instruction,
        model_name=request.config.get("model", "gemini-3-flash-preview") if request.config else "gemini-3-flash-preview",
        temperature=request.config.get("temperature", 0.7) if request.config else 0.7
    )
    
    return {"text": response_text}
