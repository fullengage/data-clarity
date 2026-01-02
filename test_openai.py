import os
from openai import OpenAI
from dotenv import load_dotenv

env_path = os.path.join(os.path.dirname(__file__), ".env")
load_dotenv(env_path, override=True)

api_key = os.getenv("VITE_OPENAI_API_KEY")
if api_key:
    api_key = api_key.strip()

print(f"Testing key: {api_key[:10]}...{api_key[-10:]}")
print(f"Length: {len(api_key)}")

client = OpenAI(api_key=api_key)

try:
    # Try a simple call
    models = client.models.list()
    print("✅ Key is valid! Found models.")
except Exception as e:
    print(f"❌ Key is invalid: {e}")
