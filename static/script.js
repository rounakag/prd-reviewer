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
    body: JSON.stringify({
      title: prdTitle,    // ✅ FIXED
      text: prdText       // ✅ FIXED
    }),
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

  const summaryMatch = text.match(/\*\*1\. Summary:\*\*\s*(.*?)(?=\n\s*\*\*2\.|$)/s);
  document.getElementById("summaryOutput").innerText = summaryMatch ? summaryMatch[1].trim() : "Not available";

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
