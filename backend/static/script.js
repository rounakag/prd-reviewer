let prdText = "";

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
  };

  if (extension === "txt") reader.readAsText(file);
  else reader.readAsArrayBuffer(file);
});

async function reviewPRD() {
  const prdTitle = document.getElementById("prdTitle").value;
  if (!prdText.trim()) {
    alert("Please upload a valid PRD file.");
    return;
  }

  uploadStatus.textContent = "Analyzing with Gemini...";
  submitBtn.disabled = true;

  const response = await fetch("https://prd-reviewer.onrender.com/review", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ title: prdTitle, text: prdText }),
  });

  const data = await response.json();
  const text = data?.response || "No valid response";
  console.log("Full Gemini Response:\n", text);

  document.getElementById("resultSection").classList.remove("hidden");
  uploadStatus.textContent = "Analysis complete.";

  const scores = extractScores(text);
  renderChart(scores);
  renderBreakdown(scores);

  const avgScore = (scores.reduce((sum, s) => sum + s.score, 0) / scores.length).toFixed(1);
  document.getElementById("overallScore").textContent = `🧮 Overall Score: ${avgScore}/10`;

  // Summary
  const summaryMatch = text.match(/\*\*1\. Summary:\*\*\s*(.*?)(?=\n\s*\*\*2\.|$)/s);
  document.getElementById("summaryOutput").innerText = summaryMatch ? summaryMatch[1].trim() : "Not available";


  // Strengths & Improvements (new format)
  const saMatch = text.match(/\*\*3\. Strengths and Areas for Improvement:\*\*([\s\S]*)/);

  if (saMatch) {
    const saText = saMatch[1];
    const strengthsMatch = saText.match(/\*\*Strengths:\*\*\s*([\s\S]*?)\*\*Areas for Improvement:\*\*/);
    const improvementsMatch = saText.match(/\*\*Areas for Improvement:\*\*\s*([\s\S]*)/);

    document.getElementById("strengthsList").innerHTML = strengthsMatch
      ? formatBullets(strengthsMatch[1], "green")
      : "<li>No strengths found</li>";

    document.getElementById("improvementList").innerHTML = improvementsMatch
      ? formatBullets(improvementsMatch[1], "amber")
      : "<li>No improvements found</li>";

  } else {
    document.getElementById("strengthsList").innerHTML = "<li>No strengths found</li>";
    document.getElementById("improvementList").innerHTML = "<li>No improvements found</li>";
  }
}

function extractScores(text) {
  const metrics = [
    "Clarity",
    "Structure",
    "Completeness",
    "Ambiguity",
    "Stakeholder Consideration",
    "Technical Depth",
    "Feasibility",
    "Business Impact Alignment"
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
    const line = `<div>${emoji} <strong>${score.dimension}</strong>: ${score.score}/10</div>`;
    breakdown.innerHTML += line;
  });
}

function formatBullets(sectionText, color = "gray") {
  return sectionText
    .trim()
    .split("\n")
    .filter(line => line.trim())
    .map(line => {
      line = line.replace(/^[-•*]\s*/, "").trim();
      const match = line.match(/\*{2,}(.*?)\*{2,}[:：]?\s*(.*)/);
      const bulletColor = color === "green" ? "#22c55e" : color === "amber" ? "#f59e0b" : "#64748b";
      if (match) {
        const title = match[1].trim();
        const description = match[2].trim();
        return `<li style="list-style-type: disc; color: ${bulletColor}"><strong>${title}:</strong> ${description}</li>`;
      } else {
        return `<li style="color: ${bulletColor}">${line}</li>`;
      }
    })
    .join("");
}
