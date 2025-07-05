from flask import Flask, request, jsonify
from flask_cors import CORS
import requests
import os
from dotenv import load_dotenv

load_dotenv()

app = Flask(__name__)
CORS(app)

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
print("Loaded GEMINI_API_KEY:", GEMINI_API_KEY)

@app.route("/review", methods=["POST"])
def review_prd():
    data = request.json
    prd_title = data.get("title", "Untitled PRD")
    prd_text = data.get("text", "")

    prompt = (
        f"You are a senior product manager. Summarize and evaluate the following PRD titled \"{prd_title}\".\n\n"
        f"1. First, summarize the PRD in 3–5 lines so that a reader understands its key objective and approach.\n\n"
        f"2. Then rate the PRD on the following criteria (1 to 5 scale):\n"
        f" - Clarity\n"
        f" - Structure\n"
        f" - Completeness\n"
        f" - Ambiguity (1 = very ambiguous, 5 = very clear)\n"
        f" - Stakeholder Consideration\n"
        f" - Technical Depth\n"
        f" - Feasibility\n"
        f" - Business Impact Alignment\n\n"
        f"3. Then write two bullet-point lists:\n"
        f" - Strengths (with 1–2 words bolded at the start of each bullet)\n"
        f" - Areas for Improvement (also with bolded start)\n\n"
        f"Here is the PRD:\n\n{prd_text}"
    )

    response = requests.post(
        "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent",
        headers={
            "Content-Type": "application/json",
            "X-goog-api-key": GEMINI_API_KEY,
        },
        json={
            "contents": [{"parts": [{"text": prompt}]}]
        }
    )

    result = response.json()
    print("Gemini raw response:", result)

    try:
        reply = result["candidates"][0]["content"]["parts"][0]["text"]
    except Exception as e:
        reply = f"Error: Could not extract Gemini response.\n\n{e}"

    return jsonify({"response": reply})

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=int(os.environ.get("PORT", 5000)))
