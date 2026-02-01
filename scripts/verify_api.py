import requests
import json

def test_active_details():
    url = "http://127.0.0.1:8000/api/settings/preset/active"
    try:
        # 1. Set Active
        requests.post(url, json={"name": "test_preset"})
        
        # 2. Get Active Details
        res = requests.get(url)
        data = res.json()
        
        print(f"Name: {data.get('name')}")
        print(f"Config Keys: {list(data.get('config', {}).keys())}")
        print(f"System Prompt Length: {len(data.get('system_prompt', ''))}")
        
        if data.get('data'):
            print("PASS: Full data returned.")
        else:
            print("FAIL: No full data.")
            
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    test_active_details()
