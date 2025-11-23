import { useState } from "react";
import "./App.css";

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
    <div className="app-container">
      <div className="content-wrapper">
        <header className="app-header">
          <h1>CV Optimizer</h1>
          <p className="subtitle">Optimize your CV for specific job opportunities</p>
        </header>

        <div className="upload-section">
          <div className="input-group">
            <label className="file-label">
              <span className="label-text">Upload CV (PDF)</span>
              <input 
                type="file" 
                accept="application/pdf" 
                onChange={handleFileChange}
                className="file-input"
              />
              {cvFile && <span className="file-name">{cvFile.name}</span>}
            </label>
          </div>

          <div className="input-group">
            <label className="textarea-label">
              <span className="label-text">Job Description</span>
              <textarea
                rows={8}
                value={jobDescription}
                onChange={(e) => setJobDescription(e.target.value)}
                className="job-description-textarea"
                placeholder="Paste the job description here..."
              />
            </label>
          </div>

          <button 
            onClick={handleAnalyze} 
            disabled={loading}
            className="analyze-button"
          >
            {loading ? "Analyzing..." : "Analyze CV"}
          </button>

          {error && <div className="error-message">{error}</div>}
        </div>

        {results && (
          <div className="results-section">
            <h2 className="results-title">Analysis Results</h2>
            
            <div className="result-card match-score">
              <div className="result-label">Match Score</div>
              <div className="result-value">{results.match_score}</div>
            </div>

            <div className="result-card">
              <div className="result-label">Key Skills to Highlight</div>
              <div className="result-list">
                {results.key_skills_to_highlight.join(", ")}
              </div>
            </div>

            <div className="result-card">
              <div className="result-label">Suggested Changes</div>
              <div className="result-list">
                {results.suggested_changes.join(", ")}
              </div>
            </div>

            <div className="result-card">
              <div className="result-label">Missing Qualifications</div>
              <div className="result-list">
                {results.missing_qualifications.join(", ")}
              </div>
            </div>

            <div className="result-card">
              <div className="result-label">Specific Recommendations</div>
              <div className="result-list">
                {results.specific_recommendations.join(", ")}
              </div>
            </div>

            <button 
              onClick={handleDownload}
              className="download-button"
            >
              Download Improved CV
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;