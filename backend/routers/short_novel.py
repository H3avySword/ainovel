
from fastapi import APIRouter, HTTPException
from models import ChatRequestShort, NodeType
from services.llm_service import generate_response

router = APIRouter()

@router.post("/short")
async def chat_short_novel(request: ChatRequestShort):
    state = request.state
    node = state.current_node
    current_node_title = (state.current_node_title or node.title or "").strip()
    novel_title = (state.novel_title or "").strip()
    chapter_title = (state.chapter_title or "").strip()
    
    # 1. Base System Instruction
    base_instruction = """你是一名短篇小说写作助手。
    你的目标是基于已提供的上下文，稳定且有创造性地协助作者完成写作任务。
    """
    
    # 2. Dynamic Context Assembly
    # 2. Dynamic Context Assembly
    node_instruction = ""
    
    if node.type == NodeType.ROOT:
        node_instruction = """
        当前创作信息：
        - 创作阶段：小说总纲
        - 小说名：{novel_title}

        """.format(
            novel_title=novel_title or current_node_title
        )
        
    elif node.type == NodeType.CHAPTER:
        node_instruction = f"""
        当前创作信息：
        - 创作阶段：小说章节
        - 小说名：{novel_title}
        - 章节名：{chapter_title or current_node_title}

        故事总纲：
        {state.novel_outline}

        章节摘要：
        {node.summary}

        当前章节正文：
        {node.content}
        """
    else:
        # Fallback for other types if any
        node_instruction = f"""
        当前焦点节点类型：{node.type}

        当前节点标题：
        {current_node_title}
        """

    # 4. Task Mode Instruction
    if not state.active_task:
        task_instruction = """
        当前模式：聊天模式。
        你的任务是与用户对话，并基于用户输入和当前上下文提供创作建议。

        聊天模式目标：
        - 提供剧情发展、人物刻画、冲突设计、节奏控制等方面的可执行建议。
        - 结合当前节点信息、故事总纲与已写内容，给出贴合上下文的意见。
        - 若用户问题不明确，优先给出2-3个可选方向并简要说明差异。

        回答要求：
        - 使用自然对话口吻，直接回应用户问题。
        - 允许解释思路，但避免空泛建议与无关内容。
        - 不要伪造设定；若上下文缺失，明确指出并给出合理假设方案。
        """
    else:
        task_instruction = """
        当前模式：写作模式。
        你的任务是按激活任务执行写作或润色。

        写作模式硬性要求：
        - 仅返回任务所需的文本结果。
        - 不要添加额外说明、前后缀、寒暄、分析过程或聊天内容。
        - 内容必须与当前节点上下文一致。
        """

        task = state.active_task
        if task.type == "SYNOPSIS":
             task_instruction += """

             【立即执行】
             任务类型：摘要/大纲写作。
             - 为当前节点直接生成可用的摘要或大纲正文。
             - 结合故事总纲，覆盖关键情节点并保持结构清晰。
             - 输出目标文本本身，不添加任何解释。
             """
        elif task.type == "CONTENT":
             task_instruction += """

             【立即执行】
             任务类型：正文写作。
             - 以当前节点摘要为蓝图，直接输出章节正文。
             - 保持人物、设定与情节因果一致。
             - 输出目标文本本身，不添加任何解释。
             """
        elif task.type == "POLISH_SELECTION":
             task_instruction += f"""

             【立即执行】
             任务类型：选中文本润色。
             - 只输出润色后的最终文本。
             - 不要解释改动，不要添加任何额外内容。
              
             <<选中文本开始>>
             {task.context_data}
             <<选中文本结束>>
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
