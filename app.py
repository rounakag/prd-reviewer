from flask import Flask, render_template, request, jsonify
from flask_cors import CORS
import os
from dotenv import load_dotenv
import google.generativeai as genai

load_dotenv()

app = Flask(__name__, static_folder='static', template_folder='templates')
CORS(app)

# Configure Gemini
genai.configure(api_key=os.getenv("GEMINI_API_KEY"))

# Create Gemini model
model = genai.GenerativeModel(model_name="models/gemini-pro")

@app.route("/")
def home():
    return render_template("index.html")

@app.route("/review", methods=["POST"])
def review():
    try:
        data = request.get_json()
        prd_text = data.get("prd_text", "").strip()

        if not prd_text:
            return jsonify({"response": "No PRD text provided."}), 400

        prompt = f"""
You are a senior product reviewer AI. Analyze the PRD below and respond in this format:

**1. Summary:** [One-paragraph summary]

**2. Scores**  
**Clarity:** x  
**Structure:** x  
**Completeness:** x  
**Ambiguity:** x  
**Stakeholder Consideration:** x  
**Technical Depth:** x  
**Feasibility:** x  
**Business Impact Alignment:** x  

**3. Strengths and Areas for Improvement:**

**Strengths:**  
- [bullet 1]  
- [bullet 2]  

**Areas for Improvement:**  
- [bullet 1]  
- [bullet 2]  

PRD:
\"\"\"
{prd_text}
\"\"\"
        """

        # Gemini expects prompt as a list of parts
        response = model.generate_content([prompt])
        print("✅ Gemini Response:", response.text)

        if response.text:
            return jsonify({"response": response.text})
        else:
            return jsonify({"response": "No response generated from Gemini."}), 500

    except Exception as e:
        print("🔥 Exception:", str(e))
        return jsonify({"response": f"Error occurred: {str(e)}"}), 500
