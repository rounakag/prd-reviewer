let prdText = "";

pdfjsLib.GlobalWorkerOptions.workerSrc = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.10.377/pdf.worker.min.js";

const fileInput = document.getElementById("prdFileInput");
const uploadStatus = document.getElementById("uploadStatus");
const submitBtn = document.getElementById("submitBtn");

fileInput.addEventListener("change", async (event) => {
  const file = event.target.files[0];
  if (!file) return;

  const extension = file.name.split(".").pop().toLowerCase();
  uploadStatus.textContent = "Uploading...";
  submitBtn.disabled = true;

  const reader = new FileReader();
  reader.onload = async () => {
    try {
      if (extension === "txt") {
        prdText = reader.result;
      } else if (extension === "pdf") {
        const typedarray = new Uint8Array(reader.result);
        const pdf = await pdfjsLib.getDocument({ data: typedarray }).promise;
        let text = "";
        for (let i = 1; i <= pdf.numPages; i++) {
          const page = await pdf.getPage(i);
          const content = await page.getTextContent();
          text += content.items.map(item => item.str).join(" ") + "\n";
        }
        prdText = text;
      } else if (extension === "docx") {
        const result = await mammoth.extractRawText({ arrayBuffer: reader.result });
        prdText = result.value;
      } else {
        uploadStatus.textContent = "Unsupported file type.";
        return;
      }

      uploadStatus.textContent = "File uploaded successfully.";
      submitBtn.disabled = false;
    } catch (error) {
      uploadStatus.textContent = "Error reading file.";
      console.error(error);
    }
  };

  if (extension === "txt") reader.readAsText(file);
  else reader.readAsArrayBuffer(file);
});

async function reviewPRD() {
  if (!prdText.trim()) {
    alert("Please upload a valid PRD file.");
    return;
  }

  uploadStatus.textContent = "Analyzing...";
  submitBtn.disabled = true;

  const response = await fetch("/review", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ prd_text: prdText }),
  });

  const data = await response.json();

  let parsed;
  try {
    parsed = typeof data.response === "string" ? JSON.parse(data.response) : data.response;
  } catch (e) {
    console.error("Invalid JSON from Gemini", data.response);
    uploadStatus.textContent = "⚠️ Invalid response from AI";
    return;
  }

  document.getElementById("resultSection").classList.remove("hidden");

  const scores = [
    { dimension: "Clarity", score: parsed.scores.clarity },
    { dimension: "Structure", score: parsed.scores.structure },
    { dimension: "Completeness", score: parsed.scores.completeness },
    { dimension: "Ambiguity", score: parsed.scores.ambiguity },
    { dimension: "Stakeholder Consideration", score: parsed.scores.stakeholder_consideration },
    { dimension: "Technical Depth", score: parsed.scores.technical_depth },
    { dimension: "Feasibility", score: parsed.scores.feasibility },
    { dimension: "Business Impact Alignment", score: parsed.scores.business_impact_alignment }
  ].map(s => ({ ...s, fullMark: 10 }));

  renderChart(scores);
  renderBreakdown(scores);

  const avg = (scores.reduce((sum, s) => sum + s.score, 0) / scores.length).toFixed(1);
  document.getElementById("overallScore").textContent = `🧮 Overall Score: ${avg}/10`;

  document.getElementById("summaryOutput").innerText = parsed.summary || "Not available";
  document.getElementById("strengthsList").innerHTML = formatBullets(parsed.strengths.join("\n"), "green");
  document.getElementById("improvementList").innerHTML = formatBullets(parsed.areas_for_improvement.join("\n"), "amber");

  uploadStatus.textContent = "✅ Analysis complete.";
  submitBtn.disabled = false;
}

function renderChart(scores) {
  const ctx = document.getElementById("scoreChart").getContext("2d");
  if (window.myRadarChart) window.myRadarChart.destroy();
  window.myRadarChart = new Chart(ctx, {
    type: 'radar',
    data: {
      labels: scores.map(s => s.dimension),
      datasets: [{
        label: 'Score',
        data: scores.map(s => s.score),
        backgroundColor: 'rgba(59, 130, 246, 0.2)',
        borderColor: '#3B82F6',
        borderWidth: 2,
        pointBackgroundColor: '#2563EB'
      }]
    },
    options: {
      scales: {
        r: {
          beginAtZero: true,
          max: 10
        }
      }
    }
  });
}

function renderBreakdown(scores) {
  const breakdown = document.getElementById("scoreBreakdown");
  breakdown.innerHTML = "";
  scores.forEach(score => {
    const emoji = score.score >= 8 ? "🔥" : score.score >= 5 ? "⚠️" : "❌";
    breakdown.innerHTML += `<div>${emoji} <strong>${score.dimension}</strong>: ${score.score}/10</div>`;
  });
}

function formatBullets(text, color) {
  const bulletColor = color === "green" ? "#22c55e" : "#f59e0b";
  return text.trim().split("\n").map(line => {
    line = line.replace(/^[-•*]\s*/, "").trim();
    return `<li style="color: ${bulletColor}">${line}</li>`;
  }).join("");
}
