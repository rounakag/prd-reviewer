from flask import Flask, render_template, request, jsonify
from flask_cors import CORS
from dotenv import load_dotenv
import os
import google.generativeai as genai
import re
import traceback

load_dotenv()

app = Flask(__name__, static_folder='static', template_folder='templates')
CORS(app)

# Configure Gemini with API key
genai.configure(api_key=os.getenv("GEMINI_API_KEY"))
model = genai.GenerativeModel("gemini-2.0-pro")  # Update if needed

def cap_scores(text):
    return re.sub(r'(\d{2,})/10', lambda m: f"{min(int(m.group(1)), 10)}/10", text)

@app.route("/")
def home():
    return render_template("index.html")

@app.route("/review", methods=["POST"])
def review():
    try:
        data = request.get_json()
        prd_text = data.get("prd_text", "").strip()

        if not prd_text:
            return jsonify({"response": "❌ No PRD text provided."}), 400

        prompt = f"""
You are a strict product reviewer AI.

Your task is to analyze the PRD below and rate each parameter **strictly on a scale from 0 to 10**. **Do not exceed 10 under any circumstances**. If unsure, give your best approximation within that range.

Respond in the following format:

**1. Summary:**  
A one-paragraph summary of the PRD.

**2. Scores (0–10 only):**  
Clarity: [0–10]  
Structure: [0–10]  
Completeness: [0–10]  
Ambiguity: [0–10]  
Stakeholder Consideration: [0–10]  
Technical Depth: [0–10]  
Feasibility: [0–10]  
Business Impact Alignment: [0–10]  

**3. Strengths and Areas for Improvement:**  
**Strengths:**  
- Bullet point 1  
- Bullet point 2  

**Areas for Improvement:**  
- Bullet point 1  
- Bullet point 2  

PRD:
\"\"\"
{prd_text}
\"\"\"
        """

        response = model.generate_content(prompt)

        if response.text:
            safe_text = cap_scores(response.text)
            return jsonify({"response": safe_text})
        else:
            return jsonify({"response": "❌ No response generated from Gemini."}), 500

    except Exception as e:
        print("🔥 Error:", e)
        traceback.print_exc()
        return jsonify({"response": f"❌ Server error: {str(e)}"}), 500
