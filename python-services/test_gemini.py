import google.generativeai as genai
import os

API_KEY = "AIzaSyBlprB-k4nGQcozaHQqb4y4kD75GUuEMxc"
genai.configure(api_key=API_KEY)

# List available models
print("Available models:")
for model in genai.list_models():
    if 'generateContent' in model.supported_generation_methods:
        print(f"  - {model.name}")

# Try to use one
try:
    model = genai.GenerativeModel('gemini-pro')
    response = model.generate_content("Say hello")
    print(f"\nTest response: {response.text}")
except Exception as e:
    print(f"\nError: {e}")
