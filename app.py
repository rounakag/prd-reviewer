from flask import Flask, render_template, request, jsonify
from flask_cors import CORS
import os
from dotenv import load_dotenv
import google.generativeai as genai

# Load environment variables
load_dotenv()
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")

app = Flask(__name__, static_folder='static', template_folder='templates')
CORS(app)

# Configure Gemini
genai.configure(api_key=GEMINI_API_KEY)
model = genai.GenerativeModel("gemini-pro")

# Prompt Template
def build_prompt(prd_text):
    return f"""
You are an expert product reviewer. Analyze the following PRD and provide insights in the exact format below.

PRD:
\"\"\"
{prd_text}
\"\"\"

Respond in **this exact format**:
**1. Summary:** A short paragraph summarizing the PRD.

**2. Scores**
**Clarity:** 1-5  
**Structure:** 1-5  
**Completeness:** 1-5  
**Ambiguity:** 1-5  
**Stakeholder Consideration:** 1-5  
**Technical Depth:** 1-5  
**Feasibility:** 1-5  
**Business Impact Alignment:** 1-5

**3. Strengths and Areas for Improvement:**

**Strengths:**
- Bullet points highlighting what’s good

**Areas for Improvement:**
- Bullet points of what can be improved
"""

@app.route('/')
def home():
    return render_template('index.html')

@app.route('/review', methods=['POST'])
def review():
    try:
        data = request.get_json()
        prd_text = data.get('prd_text', '')

        if not prd_text.strip():
            return jsonify({"error": "Empty PRD text provided."}), 400

        prompt = build_prompt(prd_text)
        response = model.generate_content(prompt)
        return jsonify({ "response": response.text })

    except Exception as e:
        print("Error:", e)
        return jsonify({ "error": str(e) }), 500

if __name__ == '__main__':
    port = int(os.environ.get("PORT", 5000))
    app.run(host="0.0.0.0", port=port)
