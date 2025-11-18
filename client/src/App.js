import { useState } from "react";

function App() {
  const [cvFile, setCvFile] = useState(null);
  const [jobDescription, setJobDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState(null);
  const [pdfFilename, setPdfFilename] = useState(null);
  const [error, setError] = useState("");

  const handleFileChange = (e) => {
    setCvFile(e.target.files[0]);
  };

  const handleAnalyze = async () => {
    if (!cvFile) {
      setError("Please upload your CV PDF file first.");
      return;
    }
    if (!jobDescription.trim()) {
      setError("Please enter the job description.");
      return;
    }

    setLoading(true);
    setError("");
    setResults(null);
    setPdfFilename(null);

    try {
      const formData = new FormData();
      formData.append("cv", cvFile);
      formData.append("jobDescription", jobDescription);

      const res = await fetch("http://localhost:3001/api/optimize-for-job", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        let msg = "Failed to analyze CV for job.";
        try {
          const errData = await res.json();
          if (errData.error) msg = errData.error;
        } catch {}
        throw new Error(msg);
      }

      const data = await res.json();
      setResults(data.analysis);
      setPdfFilename(data.pdfFilename);
    } catch (err) {
      setError(err.message || "Unexpected error occurred.");
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = () => {
    if (pdfFilename) {
      window.open(`http://localhost:3001/api/download/${pdfFilename}`, "_blank");
    }
  };

  return (
    <div style={{ maxWidth: 800, margin: "2rem auto", fontFamily: "Arial, sans-serif" }}>
      <h1>CV Optimizer – Specific Job</h1>

      <div style={{ marginBottom: "1rem" }}>
        <label>
          Upload CV (PDF):{" "}
          <input type="file" accept="application/pdf" onChange={handleFileChange} />
        </label>
      </div>

      <div style={{ marginBottom: "1rem" }}>
        <label>
          Job Description:
          <textarea
            rows={6}
            value={jobDescription}
            onChange={(e) => setJobDescription(e.target.value)}
            style={{ width: "100%", marginTop: "0.5rem" }}
          />
        </label>
      </div>

      <button onClick={handleAnalyze} disabled={loading}>
        {loading ? "Analyzing..." : "Analyze CV"}
      </button>

      {error && <p style={{ color: "red" }}>{error}</p>}

      {results && (
        <div style={{ marginTop: "2rem" }}>
          <h2>Analysis Results:</h2>
          <p><strong>Match Score:</strong> {results.match_score}</p>
          <p><strong>Key Skills to Highlight:</strong> {results.key_skills_to_highlight.join(", ")}</p>
          <p><strong>Suggested Changes:</strong> {results.suggested_changes.join(", ")}</p>
          <p><strong>Missing Qualifications:</strong> {results.missing_qualifications.join(", ")}</p>
          <p><strong>Specific Recommendations:</strong> {results.specific_recommendations.join(", ")}</p>

          <button onClick={handleDownload} style={{ marginTop: "1rem" }}>
            Download Improved CV
          </button>
        </div>
      )}
    </div>
  );
}

export default App;
