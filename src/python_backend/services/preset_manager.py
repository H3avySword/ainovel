import json
import os
import glob
from typing import Dict, Any, List, Optional

class PresetManager:
    """
    SillyTavern 预设管理器
    负责加载预设文件 (.json)，提取生成参数，并构建 System Prompt
    """
    def __init__(self, presets_dir: str):
        self.presets_dir = presets_dir
        self.presets: Dict[str, Any] = {}
        self.current_preset_name: Optional[str] = None
        self.reload_presets()

    def reload_presets(self):
        """扫描目录加载所有预设"""
        self.presets = {}
        if not os.path.exists(self.presets_dir):
            os.makedirs(self.presets_dir, exist_ok=True)
            return

        json_files = glob.glob(os.path.join(self.presets_dir, "*.json"))
        for file_path in json_files:
            try:
                # 文件名作为 key (去除 .json)
                filename = os.path.basename(file_path)
                preset_name = os.path.splitext(filename)[0]
                
                with open(file_path, 'r', encoding='utf-8') as f:
                    data = json.load(f)
                    self.presets[preset_name] = data
            except Exception as e:
                print(f"[PresetManager] Error loading {file_path}: {e}")
        
        print(f"[PresetManager] Loaded {len(self.presets)} presets: {list(self.presets.keys())}")

    def get_preset_list(self) -> List[str]:
        return list(self.presets.keys())

    def set_active_preset(self, preset_name: str):
        if preset_name in self.presets:
            self.current_preset_name = preset_name
            return True
        return False

    def get_active_preset(self) -> Optional[Dict]:
        if self.current_preset_name:
            return self.presets.get(self.current_preset_name)
        return None

    def get_generation_config(self, preset_data: Dict = None) -> Dict:
        """提取适用于 Google Gemini 的生成参数"""
        if not preset_data:
            preset_data = self.get_active_preset()
        
        if not preset_data:
            return {}

        # 映射 ST 参数到 Gemini 参数
        # ST keys: temperature, top_p, top_k, openai_max_tokens, stop
        config = {}
        
        if 'temperature' in preset_data:
            config['temperature'] = float(preset_data['temperature'])
        
        if 'top_p' in preset_data:
            config['top_p'] = float(preset_data['top_p'])
            
        if 'top_k' in preset_data:
            config['top_k'] = int(preset_data['top_k'])
            
        if 'openai_max_tokens' in preset_data:
            config['max_output_tokens'] = int(preset_data['openai_max_tokens'])
        elif 'max_tokens' in preset_data:
             config['max_output_tokens'] = int(preset_data['max_tokens'])
            
        if 'stop' in preset_data and isinstance(preset_data['stop'], list):
            config['stop_sequences'] = preset_data['stop']

        return config

    def construct_system_prompt(self, preset_data: Dict = None) -> str:
        """
        从预设中提取并组合 System Instruction
        根据 prompts 列表动态组装
        """
        if not preset_data:
            preset_data = self.get_active_preset()
        
        if not preset_data:
            return ""

        prompts = preset_data.get('prompts', [])
        # 如果没有 prompts 列表，回退到 old key? ST 预设通常都有 prompts
        if not prompts and 'system_instruction' in preset_data:
             return preset_data['system_instruction']

        system_instructions = []

        for p in prompts:
            # 1. 检查启用状态
            # 优先级：Function Arg Override > Prompt internal enabled > Default True
            is_enabled = p.get('enabled', True)
            
            # Check for override
            if preset_data.get('active_prompts_map') and p.get('identifier'):
                # identifier 存在且在 map 中有定义，则使用 map 的值
                if p['identifier'] in preset_data['active_prompts_map']:
                    is_enabled = preset_data['active_prompts_map'][p['identifier']]

            if is_enabled is False:
                continue

            # 2. 检查 Role (只处理 system)
            role = p.get('role', 'system')
            if role != 'system':
                continue

            # 3. 排除 Marker (占位符)
            if p.get('marker', False):
                continue

            content = p.get('content', '').strip()
            if content:
                system_instructions.append(content)
        
        result = "\n\n".join(system_instructions)
        print(f"[PresetManager] Constructed system prompt with {len(system_instructions)} segments. Total length: {len(result)}")
        return result


    def get_active_preset_data(self) -> Dict:
        """获取当前激活预设的完整数据"""
        return self.get_active_preset() or {}

    def update_active_preset_data(self, new_data: Dict) -> bool:
        """
        更新当前激活预设的数据 (内存中)
        允许前端修改参数并实时生效
        """
        if not self.current_preset_name or self.current_preset_name not in self.presets:
            return False
            
        # 深度合并或更新顶层 Key
        # 简单起见，更新顶层 key
        self.presets[self.current_preset_name].update(new_data)
        
        # 特殊处理: 如果前端传来了 system_instruction 字符串，
        # 我们需要将其回写到 prompts 数组中 (为了保持数据结构一致性)
        # 这是一个简化逻辑：假设我们只修改第一个 System Prompt 或创建一个新的
        if 'system_instruction' in new_data:
            sys_prompt_content = new_data['system_instruction']
            current_prompts = self.presets[self.current_preset_name].get('prompts', [])
            
            # 寻找第一个 System prompt 并更新
            found = False
            for p in current_prompts:
                 if p.get('role') == 'system' or p.get('system_prompt') is True:
                     p['content'] = sys_prompt_content
                     found = True
                     break
            
            if not found:
                # 如果没找到，创建一个
                current_prompts.insert(0, {
                    "role": "system",
                    "content": sys_prompt_content,
                    "system_prompt": True,
                    "identifier": "main"
                })
            
            self.presets[self.current_preset_name]['prompts'] = current_prompts
            
        return True
