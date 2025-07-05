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
  const text = data?.response || "No valid response";

  document.getElementById("resultSection").classList.remove("hidden");
  uploadStatus.textContent = "Analysis complete.";

  const scores = extractScores(text);
  renderChart(scores);
  renderBreakdown(scores);

  const avg = (scores.reduce((sum, s) => sum + s.score, 0) / scores.length).toFixed(1);
  document.getElementById("overallScore").textContent = `🧮 Overall Score: ${avg}/10`;

  const summaryMatch = text.match(/\*\*1\. Summary:\*\*\s*(.*?)(?=\n\s*\*\*2\.|$)/s);
  document.getElementById("summaryOutput").innerText = summaryMatch ? summaryMatch[1].trim() : "Not available";

  const saMatch = text.match(/\*\*3\. Strengths and Areas for Improvement:\*\*([\s\S]*)/);
  if (saMatch) {
    const saText = saMatch[1];
    const strengths = saText.match(/\*\*Strengths:\*\*\s*([\s\S]*?)\*\*Areas for Improvement:\*\*/);
    const improvements = saText.match(/\*\*Areas for Improvement:\*\*\s*([\s\S]*)/);

    document.getElementById("strengthsList").innerHTML = strengths
      ? formatBullets(strengths[1], "green")
      : "<li>No strengths found</li>";
    document.getElementById("improvementList").innerHTML = improvements
      ? formatBullets(improvements[1], "amber")
      : "<li>No improvements found</li>";
  }
}

function extractScores(text) {
  const metrics = [
    "Clarity", "Structure", "Completeness", "Ambiguity",
    "Stakeholder Consideration", "Technical Depth", "Feasibility", "Business Impact Alignment"
  ];
  return metrics.map(metric => {
    const regex = new RegExp(`\\*\\*${metric}:\\*\\*\\s*(\\d)`, "i");
    const match = text.match(regex);
    return {
      dimension: metric,
      score: match ? parseFloat(match[1]) * 2 : 0,
      fullMark: 10
    };
  });
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
