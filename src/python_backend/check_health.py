
import urllib.request
import json

try:
    with urllib.request.urlopen("http://127.0.0.1:8000/api/health") as response:
        print(f"Status: {response.getcode()}")
        print(response.read().decode('utf-8'))
except Exception as e:
    print(f"Health Check Failed: {e}")
