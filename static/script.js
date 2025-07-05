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

  uploadStatus.textContent = "Analyzing with Gemini...";
  submitBtn.disabled = true;

  try {
    const response = await fetch("https://prd-reviewer.onrender.com/review", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prd_text: prdText }),
    });

    const data = await response.json();
    const text = data?.response || "No valid response";
    console.log("Gemini Response:\n", text);

    document.getElementById("resultSection").classList.remove("hidden");
    uploadStatus.textContent = "Analysis complete.";

    // Call your score + summary rendering functions...
  } catch (err) {
    uploadStatus.textContent = "Error during analysis.";
    console.error(err);
  }
}
