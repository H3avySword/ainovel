from fastapi import APIRouter
from services.regex_engine import RegexEngine, RegexPlacement
from app_context import regex_engine

router = APIRouter()

@router.get("/scripts")
async def get_regex_scripts(placement: int = None, is_markdown: bool = None):
    """
    Get all loaded regex scripts.
    Optional filters:
    - placement: Filter by placement ID
    - is_markdown: Filter by markdownOnly flag
    """
    # Note: RegexEngine._get_applicable_scripts logic is slightly internal, 
    # but we can expose a getter or just return all and let frontend filter.
    # For now, let's return all scripts so frontend has full context if needed,
    # or implement filtering here.
    
    # If filters are provided, we use them.
    if placement is not None:
        scripts = regex_engine._get_applicable_scripts(placement, is_markdown if is_markdown is not None else False)
        return {"scripts": scripts}
    
    return {"scripts": regex_engine.scripts}

@router.post("/reload")
async def reload_scripts():
    regex_engine.reload_scripts()
    return {"status": "success", "count": len(regex_engine.scripts)}

from typing import Union, List, Dict, Any

@router.post("/import")
async def import_script(script_data: Union[Dict, List[Any]]):
    if regex_engine.import_script(script_data):
        return {"status": "success"}
    return {"status": "error", "message": "Import failed"}

@router.delete("/delete/{script_name}")
async def delete_script(script_name: str):
    if regex_engine.delete_script(script_name):
        return {"status": "success"}
    return {"status": "error", "message": "Delete failed or script not found"}
