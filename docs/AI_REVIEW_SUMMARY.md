# VIDYALINK — AI Reviewer Summary (FAQ)

This document provides direct, evidence-based answers to the top 10 questions asked by academic examiners and project review panels regarding the VIDYALINK AI system.

---

### Q1. What AI / algorithmic components are implemented in VIDYALINK?
VIDYALINK implements six core analytical microservices:
1. **Portfolio Scoring Model:** A canonical 6-dimension linear evaluation engine (Complexity, Tech Stack, GitHub, Documentation, Innovation, Code Quality).
2. **ATS Resume Evaluation:** Text extraction, controlled keyword matching, section completeness, and formatting heuristic analysis.
3. **Skill Extraction & Canonicalization:** Word-boundary regular expression extraction mapping real-world aliases to 30 canonical technologies.
4. **Skill Gap Analysis:** Set-theoretic gap detection computing exact coverage percentages against target job descriptions.
5. **Factual GitHub Analytics:** Metric normalization across repositories, commits, and activity recency.
6. **Alumni & Opportunity Recommendation Engine:** Multi-attribute cosine-like similarity ranking matching skills, domains, and graduating cohorts.

---

### Q2. What data does each component consume?
- **Portfolio Scoring:** Only **verified** project descriptions, technologies, documentation URLs, and connected GitHub accounts.
- **ATS Analyzer:** Actual extracted resume text and target job description text.
- **Skill Extraction:** Resume text, project descriptions, and verified project tags.
- **GitHub Analytics:** Factual repository counts, commit counts, and sync timestamps received via GitHub REST API.
- **Industry Readiness:** Aggregated verified portfolio score, ATS score, skills coverage, GitHub activity, and verification completion rate.
- **Recommendation Engine:** Student skills, career interests, graduation cohort, and candidate alumni/job attributes.

---

### Q3. How was each component tested?
Each component was tested using a dual validation harness:
1. **Offline Automated Tests:** 44 Pytest tests in `ai-service` and 104 Node.js tests in `server`.
2. **Live Empirical Validation Suite (`ai-validation-suite.js`):** Real end-to-end HTTP calls against the running FastAPI microservice, with high-resolution latency timing, mathematical error calculation, precision/recall analysis, and MongoDB persistence checks.

---

### Q4. How was correctness validated?
- **Mathematical Ground Truth:** 4 distinct fixtures with manually derived expected values were evaluated. The absolute error between expected and actual was **0.0000**.
- **Weight Sensitivity:** Each dimension was individually perturbed by $\pm 30$ points, and the score changed by the exact mathematically expected linear delta.
- **Precision and Recall:** Tested on Resume A ground-truth skills resulting in **93% Precision** and **100% Recall**.

---

### Q5. How was performance measured?
Performance was timed using `performance.now()` over 5 consecutive trials per component:
- **Portfolio Evaluation:** Mean **1.95 ms**
- **ATS Analysis:** Mean **3.81 ms**
- **Skill Extraction:** Mean **2.24 ms**
- **Readiness Calculation:** Mean **1.63 ms**
- **Recommendations:** Mean **1.69 ms**
- **Repeatability Load Test:** 80 consecutive requests executed with **0% errors** and an average latency of **1.27 ms**.

---

### Q6. Is the output deterministic?
**Yes.** All core scoring engines in VIDYALINK are 100% deterministic rule-based algorithms. Running the exact same input 5 times produced identical scores with a sample variance of **$\sigma^2 = 0.0$**.

---

### Q7. How is missing data handled?
Missing data reduces available evidence rather than punishing the candidate:
- Missing optional metrics are normalized out so absent metrics are not scored as zero.
- If no verified projects exist, the system returns an explicit `evidence_status = "insufficient_evidence"` with helpful guidance rather than a false failing score.

---

### Q8. How is hallucinated or fake evidence prevented?
1. **No LLM in Core Scoring:** Scoring does not rely on generative LLM prompts for numeric scores.
2. **Closed Skill Vocabulary:** Extraction is mapped exclusively to 30 known canonical technologies.
3. **Zero Randomness:** A static audit confirmed **zero instances** of `Math.random` or hardcoded mock scores in production paths.

---

### Q9. How is AI gated by faculty verification?
**Strict Data-Gating Rule: Verify First $\rightarrow$ Evaluate Second.**
- In Node: `isVerified = project.verificationStatus === 'Verified'`.
- In FastAPI: `verified_projects = [p for p in portfolio.projects if p.is_verified]`.
- Any unverified or pending project is **strictly excluded** from scoring. A portfolio with only unverified projects receives a score of **0.0** and is flagged as `insufficient_evidence`.

---

### Q10. What are the limitations?
1. **Niche Technologies:** Libraries outside the 30 canonical skill entries must be added to the alias dictionary.
2. **Image-Only Resumes:** Resumes must have selectable text; scanned bitmap PDFs require OCR preprocessing before extraction.
3. **Benchmark Context:** Latency values represent a single-node local execution environment; cloud deployments may experience additional network latency.
