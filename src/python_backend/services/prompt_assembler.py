
def assemble_system_prompt(preset_data: dict) -> str:
    """
    Assemble the system prompt from the preset data.
    Iterates through the 'prompts' list, filtering for enabled system prompts,
    and concatenates their content.
    """
    if not preset_data or "prompts" not in preset_data:
        # Fallback to simple system_instruction if prompts array is missing
        return preset_data.get("system_instruction", "")

    assembled_content = []
    prompts = preset_data.get("prompts", [])

    # Sort by injection_order? 
    # ST Logic: Order matters. Usually strictly following array order is safe if they are pre-sorted in JSON.
    # We will trust the array order for now.
    
    for prompt in prompts:
        # Check if enabled (default to True if key missing, mimicking ST behavior for core prompts)
        # Note: '27bc73ce...' has "enabled": false. 'main' has no "enabled" key.
        is_enabled = prompt.get("enabled", True)
        
        # Check role
        role = prompt.get("role", "system")
        
        # Check marker (Markers are placeholders, not content)
        is_marker = prompt.get("marker", False)

        if is_enabled and role == "system" and not is_marker:
            content = prompt.get("content", "").strip()
            if content:
                assembled_content.append(content)
    
    return "\n\n".join(assembled_content)
