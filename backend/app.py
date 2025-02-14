import os
from flask import Flask, request, jsonify
from dotenv import load_dotenv
import google.generativeai as genai
from flask_cors import CORS

load_dotenv()

app = Flask(__name__)
# Update CORS to allow specific origin
CORS(app, resources={
    r"/api/*": {
        "origins": ["http://localhost:8000", "http://127.0.0.1:8000"],
        "methods": ["POST", "OPTIONS"]
    }
})

# Configure Gemini
api_key = os.getenv('GEMINI_API_KEY')
if not api_key:
    raise ValueError("GEMINI_API_KEY not found in environment variables")

genai.configure(api_key=api_key)
generation_config = {
    "temperature": 0.7,  # Increased for more creative responses
    "top_p": 1,
    "top_k": 32,
    "max_output_tokens": 500,
}

model = genai.GenerativeModel(
    model_name='gemini-1.5-flash',
    generation_config=generation_config
)

def get_dating_advice(conversation_text):
    prompt = f"""You are an expert dating coach. Analyze the following text conversation and provide:
1. An assessment of the conversation dynamics
2. 2 options of what to text next
Text conversation:
{conversation_text}
Please format your response in a clear, structured way. Be very brief and concise"""

    try:
        response = model.generate_content(prompt)
        return response.text.strip()
    except Exception as e:
        print(f"Error in get_dating_advice: {str(e)}")
        raise

@app.route('/')
def home():
    return jsonify({"status": "API is running"})

@app.route('/api/health', methods=['GET'])
def health():
    return jsonify({"status": "healthy"})

@app.route('/api/parse', methods=['POST'])
def analyze_conversation():
    try:
        if not request.is_json:
            return jsonify({"error": "Content-Type must be application/json"}), 400
        
        data = request.get_json()
        conversation_text = data.get('email')  # keeping 'email' key for compatibility
        
        if not conversation_text:
            return jsonify({"error": "No conversation text provided"}), 400

        try:
            result = get_dating_advice(conversation_text)
            return jsonify({"response": result})
            
        except Exception as e:
            print(f"Analysis error: {str(e)}")
            return jsonify({
                "error": "Failed to analyze conversation",
                "details": str(e)
            }), 500

    except Exception as e:
        print(f"Server error: {str(e)}")
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    app.run(debug=True)












