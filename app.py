from flask import Flask, render_template, request, jsonify
from flask_cors import CORS
import os

app = Flask(__name__)
CORS(app)

@app.route("/")
def index():
    return render_template("index.html")

@app.route("/analyze", methods=["POST"])
def analyze():
    prd_text = request.json.get("prd_text", "")
    # Simulate AI response for now
    response = {
        "clarity": 4,
        "structure": 3,
        "completeness": 5,
        "ambiguity": 2,
        "stakeholder": 3,
        "summary": "PRD is mostly complete with a few areas for improvement."
    }
    return jsonify(response)

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=int(os.environ.get("PORT", 5000)), debug=True)
