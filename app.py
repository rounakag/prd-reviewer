from flask import Flask, request, jsonify, render_template
from flask_cors import CORS
import requests, os
from dotenv import load_dotenv

load_dotenv()
app = Flask(__name__, static_folder="static", template_folder="templates")
CORS(app)

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")


@app.route("/")
def home():
    return render_template("index.html")  # serves templates/index.html


@app.route("/review", methods=["POST"])
def review_prd():
    data = request.json
    prd_title = data.get("title", "Untitled PRD")
    prd_text = data.get("text", "")

    prompt = f"""You are a senior product manager. Summarize and evaluate the following PRD titled "{prd_title}"...

    [rest of your prompt as before]

    {prd_text}"""

    response = requests.post(
        "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent",
        headers={
            "Content-Type": "application/json",
            "X-goog-api-key": GEMINI_API_KEY,
        },
        json={"contents": [{"parts": [{"text": prompt}]}]}
    )

    result = response.json()
    try:
        reply = result["candidates"][0]["content"]["parts"][0]["text"]
    except Exception as e:
        reply = f"Error: Could not extract Gemini response.\n\n{e}"

    return jsonify({"response": reply})


if __name__ == "__main__":
    # Required for Render to detect open port
    app.run(host="0.0.0.0", port=int(os.environ.get("PORT", 5000)), debug=True)
