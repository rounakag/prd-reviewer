@app.route('/review', methods=['POST'])
def review():
    data = request.get_json()
    prd_text = data.get('prd_text', '')

    if not prd_text.strip():
        return jsonify({'error': 'No PRD text provided'}), 400

    # TEMP MOCK response (replace with Gemini API call later)
    dummy_response = """
**1. Summary:** This PRD describes the integration of payments.

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
- **Clarity:** Clear objective stated at the beginning.
- **Completeness:** Covers key user journeys.

**Areas for Improvement:**
- **Ambiguity:** Some terms are vague and need definition.
- **Structure:** Lacks proper sectioning (e.g. user stories, edge cases).
"""
    return jsonify({"response": dummy_response})
