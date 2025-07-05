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
    prd_title = data.get('title', '')
    prd_text = data.get('text', '')

    if not prd_text.strip():
        return jsonify({'error': 'No PRD text provided'}), 400

    # Dummy response mimicking Gemini output
    dummy_response = """
**1. Summary:** This PRD outlines the onboarding flow for new users to the platform, highlighting key screens, stakeholders, and success metrics.

**2. Scores**
**Clarity:** 4
**Structure:** 3
**Completeness:** 5
**Ambiguity:** 2
**Stakeholder Consideration:** 4
**Technical Depth:** 3
**Feasibility:** 5
**Business Impact Alignment:** 4

**3. Strengths and Areas for Improvement:**

**Strengths:**
- **Clarity:** Clearly states the goal and target audience.
- **Completeness:** Covers screens and metrics in detail.

**Areas for Improvement:**
- **Ambiguity:** Some parts like "flexible logic" need definition.
- **Structure:** Could benefit from sections on risks or edge cases.
"""

    return jsonify({"response": dummy_response})


if __name__ == '__main__':
    port = int(os.environ.get("PORT", 5000))
    app.run(host="0.0.0.0", port=port, debug=True)
