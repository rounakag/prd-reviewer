from flask import Flask, request, jsonify, render_template
from flask_cors import CORS
import google.generativeai as genai
import os
from dotenv import load_dotenv

load_dotenv()

app = Flask(__name__, static_folder='static', template_folder='templates')
CORS(app)

GOOGLE_API_KEY = os.getenv("GOOGLE_API_KEY")
genai.configure(api_key=GOOGLE_API_KEY)

model = genai.GenerativeModel("gemini-pro")

@app.route("/")
def index():
    return render_template("index.html")

@app.route("/review", methods=["POST"])
def review():
    data = request.get_json()
    prd_text = data.get("prd_text", "")

    prompt = f"""
You're an expert product manager. Analyze the following PRD and provide:
1. Summary
2. Scores (Clarity, Structure, Completeness, Ambiguity, Stakeholder Consideration, Technical Depth, Feasibility, Business Impact Alignment) from 1 to 5.
3. Strengths and Areas for Improvement.

PRD:
\"\"\"
{prd_text}
\"\"\"
"""

    try:
        response = model.generate_content(prompt)
        return jsonify({"response": response.text})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# ❌ Don't add app.run() here. Render uses Gunicorn and wsgi.py
