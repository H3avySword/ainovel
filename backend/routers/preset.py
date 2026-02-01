from fastapi import APIRouter, HTTPException, Request
from app_context import preset_manager
import os
import json
import time

router = APIRouter()

@router.get("/list")
async def list_presets():
    # Reload to ensure we see file system changes
    preset_manager.reload_presets()
    return {"presets": preset_manager.get_preset_list(), "active": preset_manager.current_preset_name}

@router.get("/active")
async def get_active_preset():
    """Get full details of the active preset"""
    if not preset_manager.current_preset_name:
         return {"name": None, "data": {}, "config": {}, "system_prompt": ""}
    
    data = preset_manager.get_active_preset_data()
    # Also return the derived config and system prompt for convenience/preview
    config = preset_manager.get_generation_config()
    sys_prompt = preset_manager.construct_system_prompt()
    
    return {
        "name": preset_manager.current_preset_name,
        "data": data,
        "config": config,
        "system_prompt": sys_prompt
    }

@router.post("/active")
async def set_active_preset(data: dict):
    name = data.get("name")
    # If name is empty or None, clear active preset (reset to default)
    if not name:
        preset_manager.current_preset_name = None
        return {"status": "success", "active": None}
    
    if preset_manager.set_active_preset(name):
        return {"status": "success", "active": name}
    else:
        raise HTTPException(status_code=404, detail="Preset not found")

@router.post("/update")
async def update_preset(data: dict):
    """Update active preset parameters in-memory"""
    if preset_manager.update_active_preset_data(data):
        return {"status": "success"}
    else:
        raise HTTPException(status_code=400, detail="Failed to update preset (No active preset?)")

@router.post("/import")
async def import_preset(request: Request):
    """Import a preset JSON file (Legacy - file write now handled by Electron)"""
    try:
        data = await request.json()
        if not isinstance(data, dict):
             raise HTTPException(status_code=400, detail="Invalid JSON")
        
        # For backward compatibility, still write file if called directly
        name = data.get("name", f"imported_{int(time.time())}")
        safe_name = "".join([c for c in name if c.isalnum() or c in (' ', '_', '-')]).strip()
        if not safe_name: safe_name = "preset"
        
        save_path = os.path.join(preset_manager.presets_dir, f"{safe_name}.json")
        
        with open(save_path, 'w', encoding='utf-8') as f:
            json.dump(data, f, indent=4, ensure_ascii=False)
            
        preset_manager.reload_presets()
        return {"status": "success", "name": safe_name}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/reload")
async def reload_presets():
    """Reload presets from disk (called after Electron writes files)"""
    preset_manager.reload_presets()
    return {"status": "success", "count": len(preset_manager.presets)}
