let prdText = "";
let currentAnalysis = null;

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

  uploadStatus.textContent = "🔍 Analyzing PRD with AI...";
  submitBtn.disabled = true;

  try {
    const response = await fetch("/review", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prd_text: prdText }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    let responseText = data.response;

    console.log("Raw response:", responseText);

    // Clean markdown code blocks if present
    if (responseText.includes('```json')) {
      responseText = responseText.replace(/```json\n?/g, '').replace(/\n?```/g, '').trim();
    }

    // Parse the cleaned JSON
    let parsed;
    try {
      parsed = JSON.parse(responseText);
      currentAnalysis = parsed; // Store for template generation
    } catch (parseError) {
      console.error("JSON Parse Error:", parseError);
      console.error("Cleaned response:", responseText);
      uploadStatus.textContent = "⚠️ Invalid JSON response from AI";
      submitBtn.disabled = false;
      return;
    }

    // Validate the parsed response
    if (!parsed || !parsed.summary || !parsed.scores) {
      uploadStatus.textContent = "⚠️ Invalid response structure from AI";
      submitBtn.disabled = false;
      return;
    }

    // Display results
    document.getElementById("resultSection").classList.remove("hidden");
    uploadStatus.textContent = "✅ Analysis complete!";

    // Render all sections
    renderSummarySection(parsed);
    renderScoreSection(parsed);
    renderStrengthsAndImprovements(parsed);
    renderMissingSections(parsed);
    renderActionItems(parsed);
    renderRiskAssessment(parsed);
    renderMetadata(parsed);

    submitBtn.disabled = false;

  } catch (error) {
    console.error("Error:", error);
    uploadStatus.textContent = "⚠️ Error analyzing PRD";
    submitBtn.disabled = false;
  }
}

function renderSummarySection(parsed) {
  document.getElementById("summaryOutput").innerText = parsed.summary;

  // Add PRD type and complexity badges
  const metadataDiv = document.getElementById("prdMetadata");
  metadataDiv.innerHTML = `
    <div class="flex gap-2 mb-4">
      <span class="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium">
        ${parsed.prd_type || 'General'}
      </span>
      <span class="px-3 py-1 bg-purple-100 text-purple-800 rounded-full text-sm font-medium">
        ${parsed.estimated_complexity || 'Medium'} Complexity
      </span>
    </div>
  `;
}

function renderScoreSection(parsed) {
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
  const avgColor = avg >= 8 ? 'text-green-600' : avg >= 6 ? 'text-yellow-600' : 'text-red-600';
  document.getElementById("overallScore").innerHTML = `
    <span class="text-2xl font-bold ${avgColor}">${avg}/10</span>
    <span class="text-gray-600 ml-2">Overall Score</span>
  `;
}

function renderStrengthsAndImprovements(parsed) {
  document.getElementById("strengthsList").innerHTML = parsed.strengths && parsed.strengths.length
    ? parsed.strengths.map(s => `<li class="flex items-start gap-2 mb-2"><span class="text-green-500 mt-1">✅</span><span>${s}</span></li>`).join("")
    : "<li>No strengths identified</li>";

  document.getElementById("improvementList").innerHTML = parsed.areas_for_improvement && parsed.areas_for_improvement.length
    ? parsed.areas_for_improvement.map(p => `<li class="flex items-start gap-2 mb-2"><span class="text-amber-500 mt-1">⚠️</span><span>${p}</span></li>`).join("")
    : "<li>No improvements identified</li>";
}

function renderMissingSections(parsed) {
  const missingSectionsDiv = document.getElementById("missingSections");
  if (parsed.missing_sections && parsed.missing_sections.length > 0) {
    missingSectionsDiv.innerHTML = parsed.missing_sections.map(section => `
      <div class="border-l-4 border-red-400 pl-4 py-2 mb-3">
        <div class="flex items-center gap-2">
          <span class="font-semibold text-red-700">${section.section}</span>
          <span class="px-2 py-1 text-xs rounded ${
            section.importance === 'High' ? 'bg-red-100 text-red-800' :
            section.importance === 'Medium' ? 'bg-yellow-100 text-yellow-800' :
            'bg-gray-100 text-gray-800'
          }">${section.importance}</span>
        </div>
        <p class="text-sm text-gray-600 mt-1">${section.description}</p>
      </div>
    `).join("");
  } else {
    missingSectionsDiv.innerHTML = "<p class='text-green-600'>🎉 All essential sections are present!</p>";
  }
}

function renderActionItems(parsed) {
  const actionItemsDiv = document.getElementById("actionItems");
  if (parsed.action_items && parsed.action_items.length > 0) {
    actionItemsDiv.innerHTML = parsed.action_items.map(item => `
      <div class="border border-gray-200 rounded-lg p-4 mb-3">
        <div class="flex items-start justify-between">
          <div class="flex-1">
            <h4 class="font-medium text-gray-900">${item.task}</h4>
            <div class="flex items-center gap-4 mt-2 text-sm text-gray-600">
              <span class="flex items-center gap-1">
                <span class="w-2 h-2 rounded-full ${
                  item.priority === 'High' ? 'bg-red-500' :
                  item.priority === 'Medium' ? 'bg-yellow-500' :
                  'bg-green-500'
                }"></span>
                ${item.priority} Priority
              </span>
              <span>👤 ${item.owner}</span>
              <span>⏱️ ${item.effort}</span>
            </div>
          </div>
        </div>
      </div>
    `).join("");
  } else {
    actionItemsDiv.innerHTML = "<p class='text-gray-600'>No specific action items identified.</p>";
  }
}

function renderRiskAssessment(parsed) {
  const riskDiv = document.getElementById("riskAssessment");
  if (parsed.risk_assessment) {
    const risks = parsed.risk_assessment;
    riskDiv.innerHTML = `
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <div>
          <h4 class="font-medium text-red-700 mb-2">🔧 Technical Risks</h4>
          <ul class="text-sm space-y-1">
            ${risks.technical_risks?.map(risk => `<li>• ${risk}</li>`).join('') || '<li>No technical risks identified</li>'}
          </ul>
        </div>
        <div>
          <h4 class="font-medium text-orange-700 mb-2">💼 Business Risks</h4>
          <ul class="text-sm space-y-1">
            ${risks.business_risks?.map(risk => `<li>• ${risk}</li>`).join('') || '<li>No business risks identified</li>'}
          </ul>
        </div>
        <div>
          <h4 class="font-medium text-blue-700 mb-2">⏰ Timeline Risks</h4>
          <ul class="text-sm space-y-1">
            ${risks.timeline_risks?.map(risk => `<li>• ${risk}</li>`).join('') || '<li>No timeline risks identified</li>'}
          </ul>
        </div>
        <div>
          <h4 class="font-medium text-green-700 mb-2">🛡️ Mitigation Suggestions</h4>
          <ul class="text-sm space-y-1">
            ${risks.mitigation_suggestions?.map(suggestion => `<li>• ${suggestion}</li>`).join('') || '<li>No specific mitigations suggested</li>'}
          </ul>
        </div>
      </div>
    `;
  } else {
    riskDiv.innerHTML = "<p class='text-gray-600'>No risk assessment available.</p>";
  }
}

function renderMetadata(parsed) {
  const templateBtn = document.getElementById("generateTemplateBtn");
  if (parsed.recommended_template) {
    templateBtn.style.display = 'block';
    templateBtn.onclick = () => generateTemplate();
  }
}

async function generateTemplate() {
  if (!currentAnalysis) return;

  const templateBtn = document.getElementById("generateTemplateBtn");
  const originalText = templateBtn.textContent;
  templateBtn.textContent = "Generating...";
  templateBtn.disabled = true;

  try {
    const response = await fetch("/generate-template", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prd_analysis: currentAnalysis }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();

    // Show template in modal
    showTemplateModal(data.template);

  } catch (error) {
    console.error("Error generating template:", error);
    alert("Error generating template. Please try again.");
  } finally {
    templateBtn.textContent = originalText;
    templateBtn.disabled = false;
  }
}

function showTemplateModal(template) {
  const modal = document.getElementById("templateModal");
  const templateContent = document.getElementById("templateContent");

  templateContent.textContent = template;
  modal.classList.remove("hidden");
}

function closeTemplateModal() {
  document.getElementById("templateModal").classList.add("hidden");
}

function copyTemplate() {
  const templateContent = document.getElementById("templateContent");
  navigator.clipboard.writeText(templateContent.textContent).then(() => {
    const copyBtn = document.getElementById("copyTemplateBtn");
    const originalText = copyBtn.textContent;
    copyBtn.textContent = "Copied!";
    setTimeout(() => {
      copyBtn.textContent = originalText;
    }, 2000);
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
        pointBackgroundColor: '#2563EB',
        pointBorderColor: '#1E40AF',
        pointRadius: 5
      }]
    },
    options: {
      scales: {
        r: {
          beginAtZero: true,
          max: 10,
          ticks: {
            stepSize: 2
          }
        }
      },
      plugins: {
        legend: {
          display: false
        }
      }
    }
  });
}

function renderBreakdown(scores) {
  const breakdown = document.getElementById("scoreBreakdown");
  breakdown.innerHTML = "";
  scores.forEach(score => {
    const percentage = (score.score / 10) * 100;
    const color = score.score >= 8 ? 'bg-green-500' : score.score >= 6 ? 'bg-yellow-500' : 'bg-red-500';

    breakdown.innerHTML += `
      <div class="flex items-center justify-between py-2">
        <span class="text-sm font-medium">${score.dimension}</span>
        <div class="flex items-center gap-2">
          <div class="w-20 bg-gray-200 rounded-full h-2">
            <div class="${color} h-2 rounded-full transition-all duration-500" style="width: ${percentage}%"></div>
          </div>
          <span class="text-sm font-bold w-8 text-right">${score.score}</span>
        </div>
      </div>
    `;
  });
}