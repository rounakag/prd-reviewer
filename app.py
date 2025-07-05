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
**1. Summary:** This PRD outlines a feature for enabling bookmarks on articles.

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
- **Clear Objective:** Clear articulation of intent.
- **User Value:** Strong benefit for readers.

**Areas for Improvement:**
- **Lacks Technical Details:** No implementation guidance.
- **Ambiguity:** Some flow details are vague.
- **No Metrics:** Missing measurement criteria.
"""
    return jsonify({"response": dummy_response})

if __name__ == '__main__':
    port = int(os.environ.get("PORT", 5000))
    app.run(host="0.0.0.0", port=port)
