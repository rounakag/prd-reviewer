from flask import Flask, render_template, request, jsonify
from flask_cors import CORS
import os
from dotenv import load_dotenv

load_dotenv()

app = Flask(__name__, static_folder='static', template_folder='templates')
CORS(app)

@app.route('/')
def home():
    return render_template('index.html')

@app.route('/review', methods=['POST'])
def review():
    data = request.get_json()
    prd_text = data.get('prd_text', '')

    dummy_response = """
**1. Summary:** This PRD describes a feature to allow users to bookmark articles.

**2. Scores**
**Clarity:** 4  
**Structure:** 5  
**Completeness:** 3  
**Ambiguity:** 2  
**Stakeholder Consideration:** 4  
**Technical Depth:** 2  
**Feasibility:** 3  
**Business Impact Alignment:** 4  

**3. Strengths and Areas for Improvement:**

**Strengths:**
- **Clear Intent:** The objective is clearly stated.
- **User Benefit:** Helps users easily save useful articles.

**Areas for Improvement:**
- **Missing Tech Detail:** No architecture or flow.
- **Ambiguity:** Some steps aren't clearly explained.
- **Metrics:** No success criteria defined.
"""

    return jsonify({"response": dummy_response})
2