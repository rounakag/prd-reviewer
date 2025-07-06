from flask import Flask, render_template, request, jsonify
from flask_cors import CORS
from dotenv import load_dotenv
import os
import google.generativeai as genai
import re
import traceback
import json

load_dotenv()

app = Flask(__name__, static_folder='static', template_folder='templates')
CORS(app)

# ✅ Gemini setup with recommended stable model
genai.configure(api_key=os.getenv("GEMINI_API_KEY"))
model = genai.GenerativeModel("gemini-1.5-pro-latest")


# ✅ Utility to cap scores at 10
def cap_scores(text):
    return re.sub(r'(\d{2,})/10', lambda m: f"{min(int(m.group(1)), 10)}/10", text)


def clean_json_response(response_text):
    """Clean and extract JSON from markdown code blocks"""
    # Remove markdown code blocks
    if '```json' in response_text:
        response_text = re.sub(r'```json\s*\n?', '', response_text)
        response_text = re.sub(r'\n?\s*```', '', response_text)

    # Remove any extra whitespace
    response_text = response_text.strip()

    return response_text


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

        # Enhanced prompt with comprehensive analysis
        prompt = f"""
        You are a senior product manager and technical architect with 15+ years of experience reviewing Product Requirement Documents (PRDs). 

        Analyze the PRD below and provide a comprehensive review in the following JSON format:

        {{
          "summary": "Comprehensive 2-3 sentence summary of the PRD's purpose, scope, and overall quality",
          "scores": {{
            "clarity": number between 0 and 10,
            "structure": number between 0 and 10,
            "completeness": number between 0 and 10,
            "ambiguity": number between 0 and 10,
            "stakeholder_consideration": number between 0 and 10,
            "technical_depth": number between 0 and 10,
            "feasibility": number between 0 and 10,
            "business_impact_alignment": number between 0 and 10
          }},
          "strengths": ["specific strength 1", "specific strength 2", "specific strength 3"],
          "areas_for_improvement": ["specific improvement 1", "specific improvement 2", "specific improvement 3"],
          "missing_sections": [
            {{"section": "Section Name", "importance": "High/Medium/Low", "description": "Why this section is needed"}},
            {{"section": "Another Section", "importance": "High/Medium/Low", "description": "Why this section is needed"}}
          ],
          "action_items": [
            {{"task": "Specific actionable task", "priority": "High/Medium/Low", "owner": "Suggested role/team", "effort": "1-2 days/1 week/etc"}},
            {{"task": "Another specific task", "priority": "High/Medium/Low", "owner": "Suggested role/team", "effort": "1-2 days/1 week/etc"}}
          ],
          "risk_assessment": {{
            "technical_risks": ["risk 1", "risk 2"],
            "business_risks": ["risk 1", "risk 2"],
            "timeline_risks": ["risk 1", "risk 2"],
            "mitigation_suggestions": ["suggestion 1", "suggestion 2"]
          }},
          "prd_type": "Feature Enhancement/New Product/API/Mobile App/Web App/Integration/Other",
          "estimated_complexity": "Low/Medium/High/Very High",
          "recommended_template": "Based on the analysis, what type of PRD template would be most suitable"
        }}

        Scoring Guidelines:
        - Clarity (0-10): How clear and understandable is the writing?
        - Structure (0-10): How well organized and logical is the document?
        - Completeness (0-10): How complete are the requirements and specifications?
        - Ambiguity (0-10): How many unclear or vague statements exist? (lower score = more ambiguous)
        - Stakeholder Consideration (0-10): How well does it consider different stakeholders?
        - Technical Depth (0-10): How thorough are the technical requirements?
        - Feasibility (0-10): How realistic and achievable are the requirements?
        - Business Impact Alignment (0-10): How well aligned is it with business objectives?

        Analysis Instructions:
        1. Look for standard PRD sections: Problem Statement, Solution Overview, Requirements, Success Metrics, Timeline, Resources, etc.
        2. Identify missing critical sections that would improve the PRD
        3. Generate specific, actionable improvement tasks
        4. Consider technical feasibility and business impact
        5. Assess potential risks and suggest mitigations
        6. Recommend appropriate PRD template type

        Rules:
        - Respond with valid JSON only
        - Be specific and actionable in feedback
        - All scores must be between 0 and 10
        - Provide at least 3 strengths and 3 areas for improvement
        - Include 2-5 missing sections if applicable
        - Include 3-6 action items
        - Do not wrap JSON in markdown code blocks

        PRD Text:
        \"\"\"
        {prd_text}
        \"\"\"
        """

        response = model.generate_content(prompt)

        if response.text:
            print("✅ Gemini Raw Response:\n", response.text)

            # Clean the response
            cleaned_response = clean_json_response(response.text)
            cleaned_response = cap_scores(cleaned_response)

            # Validate JSON before sending
            try:
                json.loads(cleaned_response)
                print("✅ JSON validation successful")
            except json.JSONDecodeError as e:
                print(f"❌ JSON validation failed: {e}")
                print(f"Cleaned response: {cleaned_response}")
                return jsonify({"response": "❌ Invalid JSON generated by AI."}), 500

            return jsonify({"response": cleaned_response})
        else:
            print("⚠️ Gemini returned empty response")
            return jsonify({"response": "❌ No response generated by Gemini."}), 500

    except Exception as e:
        print("🔥 Error:", e)
        traceback.print_exc()
        return jsonify({"response": f"❌ Server error: {str(e)}"}), 500


@app.route("/generate-template", methods=["POST"])
def generate_template():
    try:
        data = request.get_json()
        prd_analysis = data.get("prd_analysis", {})
        prd_type = prd_analysis.get("prd_type", "General")
        missing_sections = prd_analysis.get("missing_sections", [])

        template_prompt = f"""
        Based on the PRD analysis, generate a comprehensive PRD template for a {prd_type} project.

        Missing sections identified: {[section['section'] for section in missing_sections]}

        Create a detailed PRD template in markdown format with the following structure:
        1. Include all standard PRD sections
        2. Add the missing sections identified in the analysis
        3. Provide guidance text for each section
        4. Include examples where helpful
        5. Make it specific to the {prd_type} type

        Return only the markdown template without any wrapper or explanation.
        """

        response = model.generate_content(template_prompt)

        if response.text:
            return jsonify({"template": response.text})
        else:
            return jsonify({"template": "❌ Could not generate template"}), 500

    except Exception as e:
        print("🔥 Template generation error:", e)
        return jsonify({"template": f"❌ Error generating template: {str(e)}"}), 500


if __name__ == "__main__":
    app.run(debug=True)