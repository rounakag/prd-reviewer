import google.generativeai as genai

# Load API key
genai.configure(api_key=os.getenv("GEMINI_API_KEY"))

# Correct model name
model = genai.GenerativeModel(model_name="models/gemini-2.0-flash")

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

        response = model.generate_content(prompt)
        print("✅ Gemini Response:", response.text)

        if response.text:
            return jsonify({"response": response.text})
        else:
            return jsonify({"response": "No response generated from Gemini."}), 500

    except Exception as e:
        print("🔥 Error:", str(e))
        return jsonify({"response": f"Error occurred: {str(e)}"}), 500
