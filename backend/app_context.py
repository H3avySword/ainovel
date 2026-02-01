from pathlib import Path
import os
from services.preset_manager import PresetManager
from services.regex_engine import RegexEngine

# Define Paths
BACKEND_DIR = Path(__file__).parent
APP_DIR = BACKEND_DIR.parent  # localapp directory
DATA_DIR = APP_DIR / "data"
PRESETS_DIR = DATA_DIR / "presets"
REGEX_DIR = DATA_DIR / "regex"

# Ensure directories exist
os.makedirs(PRESETS_DIR, exist_ok=True)
os.makedirs(REGEX_DIR, exist_ok=True)

# Instantiate Singletons
preset_manager = PresetManager(str(PRESETS_DIR))
regex_engine = RegexEngine(str(REGEX_DIR))
