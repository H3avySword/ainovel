import json
import re
import os
from typing import List, Dict, Any, Optional, Union
import glob

# Enum 模拟 SillyTavern 及其常量
class RegexPlacement:
    MD_DISPLAY = 0        # Display only (Markdown) - Not used in Python backend usually, but for completeness
    USER_INPUT = 1        # User Input (Prompt cleaning/modification)
    AI_OUTPUT = 2         # AI Output (Post-processing)
    SLASH_COMMAND = 3
    WORLD_INFO = 5
    REASONING = 6         # Inner Thoughts

class RegexEngine:
    """
    SillyTavern 正则引擎的 Python 移植版
    负责加载 regex 脚本并根据上下文执行替换
    """
    def __init__(self, scripts_dir: str):
        self.scripts_dir = scripts_dir
        self.scripts: List[Dict] = []
        self.reload_scripts()

    def reload_scripts(self):
        """加载目录下的所有 json 正则脚本"""
        self.scripts = []
        if not os.path.exists(self.scripts_dir):
            os.makedirs(self.scripts_dir, exist_ok=True)
            return

        json_files = glob.glob(os.path.join(self.scripts_dir, "*.json"))
        # 排序以保证加载顺序一致性 (文件名排序)
        json_files.sort()

        for file_path in json_files:
            try:
                with open(file_path, 'r', encoding='utf-8') as f:
                    content = json.load(f)
                    
                    # 兼容：有些文件是 list of scripts，有些可能是单个 (ST 导出通常是 list)
                    if isinstance(content, list):
                        self.scripts.extend(content)
                    elif isinstance(content, dict):
                        # 单个脚本对象，或者包含 scripts 字段的对象
                        if 'scripts' in content and isinstance(content['scripts'], list):
                             self.scripts.extend(content['scripts'])
                        else:
                             self.scripts.append(content)
            except Exception as e:
                print(f"[RegexEngine] Error loading {file_path}: {e}")

        print(f"[RegexEngine] Loaded {len(self.scripts)} regex scripts.")

    def _get_applicable_scripts(self, placement: int, is_markdown: bool = False, is_prompt: bool = False, overrides: Dict[str, bool] = None) -> List[Dict]:
        """筛选适用于当前上下文的脚本"""
        applicable = []
        for script in self.scripts:
            # 1. Check Disabled
            # Priority: Overrides > File Disabled > Default False (Enabled)
            script_name = script.get('scriptName')
            is_disabled = script.get('disabled', False)
            
            if overrides and script_name and script_name in overrides:
                # If override exists, use the INVERSE (frontend sends 'isActive', so True means Enabled)
                is_disabled = not overrides[script_name]

            if is_disabled:
                continue

            # 2. Check Placement
            # placement 字段通常是一个 list of ints，例如 [1, 2]
            script_placement = script.get('placement', [])
            if not isinstance(script_placement, list):
                # 兼容可能的旧格式
                script_placement = [script_placement]
            
            if placement not in script_placement:
                continue

            # 3. Check Flags (markdownOnly / promptOnly)
            # 逻辑参考 engine.js:
            # if (script.markdownOnly && !isMarkdown) return false;
            # if (script.promptOnly && !isPrompt) return false;
            
            if script.get('markdownOnly', False) and not is_markdown:
                continue
            
            if script.get('promptOnly', False) and not is_prompt:
                continue

            applicable.append(script)
        
        return applicable

    def process_string(self, text: str, placement: int, is_markdown: bool = False, is_prompt: bool = False, context: Dict = None, overrides: Dict[str, bool] = None) -> str:
        """
        核心处理函数
        :param text: 待处理的字符串
        :param placement: 当前所处的阶段 (User Input / AI Output 等)
        :param is_markdown: 是否为显示阶段
        :param is_prompt: 是否为 Prompt 构建阶段
        :param context: 上下文参数，用于宏替换 ({{char}}, {{user}})
        :param overrides: 前端传递的 switch map
        """
        if not text:
            return ""

        scripts = self._get_applicable_scripts(placement, is_markdown, is_prompt, overrides)
        
        # 简单的宏替换 (如果 regex 本身需要匹配具体名字)
        # 注意：ST 的 regex 很多是直接对内容做处理，宏替换通常是在 regex 执行前还是执行中？
        # 查看 ST 源码 runRegexScript: 
        # 它会在执行前通过 substituteParamsDeep 替换 regex 字符串本身的宏，
        # 也就是 regex pattern 里的 {{char}} 会变成实际名字。
        
        for script in scripts:
            try:
                regex_pattern = script.get('findRegex')
                replace_string = script.get('replaceString', '')
                
                if not regex_pattern:
                    continue

                # --- 1. 处理 Regex Pattern 中的宏 ---
                if context:
                    # 简单替换：将 pattern 中的 {{char}} 等替换为实际值
                    # 注意：如果名字里有正则特殊字符，需要 escape
                    for key, val in context.items():
                        macro = f"{{{{{key}}}}}"
                        if macro in regex_pattern:
                            safe_val = re.escape(val)
                            regex_pattern = regex_pattern.replace(macro, safe_val)

                # --- 2. 编译 Regex ---
                # ST default flags: usually 'g' (global) 'm' (multiline) 'i' (case insensitive depends)
                # JS Regex flags translate: 
                # g -> re.findall mechanism (but sub replaces all by default)
                # m -> re.MULTILINE
                # s -> re.DOTALL (if dotAll flag)
                # i -> re.IGNORECASE
                
                flags = 0
                regex_options = script.get('regexOptions', '') # ST JSON 可能包含 flags 字段? 
                # ST Preset JSON example: "findRegex": "/^...</gm" 或者是纯字符串
                # 如果是纯字符串，ST 默认 flags 是 'gm'
                
                # 在 ST 中 regex 经常存储为 "/pattern/flags" 格式字符串，或者分开
                # 我们的示例 json 显示 "findRegex": "/<think>[\\s\\S]*?<\\/think>/g"
                
                pattern_str = regex_pattern
                
                # 解析 /pattern/flags 格式
                if pattern_str.startswith('/') and pattern_str.rfind('/') > 0:
                    last_slash = pattern_str.rfind('/')
                    flags_str = pattern_str[last_slash+1:]
                    pattern_body = pattern_str[1:last_slash]
                    
                    if 'i' in flags_str: flags |= re.IGNORECASE
                    if 'm' in flags_str: flags |= re.MULTILINE
                    if 's' in flags_str: flags |= re.DOTALL
                    # g flag is implicit in re.sub
                    
                    pattern_str = pattern_body
                else:
                    # Default flags if not specified like JS
                    flags = re.MULTILINE 

                # --- 3. 执行替换 ---
                # Python re.sub handles substitution
                # ST replaceString supports $1, $2 etc. Python uses \1, \2
                # Need to convert $ to \ for group content
                py_replace_string = replace_string.replace('$', '\\')
                
                # 特殊处理：如果替换为空字符串，直接置空
                # ST logic allows script to run plain replace
                
                text = re.sub(pattern_str, py_replace_string, text, flags=flags)

            except Exception as e:
                print(f"[RegexEngine] Script '{script.get('scriptName')}' failed: {e}")
                continue

        return text

    def import_script(self, content: Union[Dict, List[Dict]], filename: str = None) -> bool:
        """
        Import a new regex script (save json to disk).
        Supports single script (Dict) or list of scripts (List[Dict]).
        """
        try:
            if not filename:
                if isinstance(content, list):
                    # For a collection/list, use a timestamped name
                    import time
                    filename = f"imported_collection_{int(time.time())}.json"
                else:
                    # Generate safe filename from scriptName or UUID
                    name = content.get('scriptName', 'unnamed_script')
                    safe_name = "".join(c for c in name if c.isalnum() or c in (' ', '_', '-')).strip().replace(' ', '_')
                    filename = f"{safe_name}.json"
            
            if not filename.endswith('.json'):
                filename += '.json'

            file_path = os.path.join(self.scripts_dir, filename)
            
            # Write file
            with open(file_path, 'w', encoding='utf-8') as f:
                json.dump(content, f, indent=2, ensure_ascii=False)
            
            self.reload_scripts()
            return True
        except Exception as e:
            print(f"[RegexEngine] Import failed: {e}")
            return False

    def delete_script(self, script_name: str) -> bool:
        """
        Delete a script by scriptName (find file and delete)
        """
        try:
            target_file = None
            # Need to scan again because self.scripts doesn't store path directly in memory currently
            json_files = glob.glob(os.path.join(self.scripts_dir, "*.json"))
            
            for file_path in json_files:
                try:
                    with open(file_path, 'r', encoding='utf-8') as f:
                        content = json.load(f)
                        if isinstance(content, dict):
                            if content.get('scriptName') == script_name:
                                target_file = file_path
                                break
                        elif isinstance(content, list):
                             # Check inside list
                             for s in content:
                                 if s.get('scriptName') == script_name:
                                     # Warning: Deleting from a list file is complex. 
                                     # For now, if found in a list file, we might not want to delete the whole file.
                                     # Simplifying assumption: One script per file for managed scripts.
                                     pass
                except:
                    continue
            
            if target_file:
                os.remove(target_file)
                self.reload_scripts()
                return True
            else:
                print(f"[RegexEngine] Script {script_name} not found for deletion.")
                return False

        except Exception as e:
            print(f"[RegexEngine] Delete failed: {e}")
            return False
