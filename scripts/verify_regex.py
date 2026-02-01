import sys
import os
from pathlib import Path

# Add backend to sys.path
sys.path.append(os.path.join(os.getcwd(), 'backend'))

from services.regex_engine import RegexEngine, RegexPlacement
from services.preset_manager import PresetManager

# Setup Paths
BACKEND_DIR = Path("backend")
PRESETS_DIR = BACKEND_DIR / "data" / "presets"
REGEX_DIR = BACKEND_DIR / "data" / "regex"

def test_regex():
    print("--- Testing Regex Engine ---")
    engine = RegexEngine(str(REGEX_DIR))
    engine.reload_scripts()
    
    # Test 1: Prompt Regex (apple -> ORANGE) for USER_INPUT
    input_text = "I like apple."
    processed = engine.process_string(input_text, RegexPlacement.USER_INPUT, is_prompt=True)
    print(f"Input: {input_text}")
    print(f"Output: {processed}")
    
    if "ORANGE" in processed:
        print("PASS: Prompt Regex works.")
    else:
        print("FAIL: Prompt Regex failed.")

    # Test 2: Display Regex (AI -> **VIRTUAL INT**) for MD_DISPLAY or AI_OUTPUT (if we use that)
    # test_regex.json uses placement [2] (AI_OUTPUT) and markdownOnly=true.
    # Logic in process_string filters by placement & markdown.
    # If we call with placement=2, markdown=False -> Should match? 
    # ST Logic: if (markdownOnly && !isMarkdown) return false.
    # So we must pass is_markdown=True.
    
    input_text = "AI is cool."
    # Case A: is_markdown=True, placement=2
    processed_display = engine.process_string(input_text, RegexPlacement.AI_OUTPUT, is_markdown=True)
    print(f"Display Input: {input_text}")
    print(f"Display Output: {processed_display}")
    
    if "**VIRTUAL INT**" in processed_display:
        print("PASS: Display Regex works.")
    else:
        print("FAIL: Display Regex failed (Expected **VIRTUAL INT**).")

def test_preset():
    print("\n--- Testing Preset Manager ---")
    manager = PresetManager(str(PRESETS_DIR))
    manager.reload_presets()
    
    presets = manager.get_preset_list()
    print(f"Presets: {presets}")
    
    if "test_preset" in presets:
        print("PASS: Preset list contains test_preset.")
        
        manager.set_active_preset("test_preset")
        config = manager.get_generation_config()
        print(f"Config: {config}")
        
        if config.get("temperature") == 0.99:
            print("PASS: Temperature correct.")
        else:
            print(f"FAIL: Temperature mismatch (Expected 0.99, got {config.get('temperature')})")
            
        sys_prompt = manager.construct_system_prompt()
        print(f"System Prompt: {sys_prompt}")
        if "Test Assistant" in sys_prompt:
             print("PASS: System Prompt correct.")
        else:
             print("FAIL: System Prompt extraction failed.")

    else:
        print("FAIL: test_preset not found.")

if __name__ == "__main__":
    # Ensure CWD is localapp root so imports work?
    # backend/services imports need PYTHONPATH setup or run from root with modifications.
    # Since my script does `from services...` it expects `backend` in path or running from backend?
    # Actually locally `services` is inside `backend/`.
    # To run this script from `localapp` root:
    # Need to append `backend` to sys.path
    import sys
    sys.path.append("backend")
    
    test_regex()
    test_preset()
