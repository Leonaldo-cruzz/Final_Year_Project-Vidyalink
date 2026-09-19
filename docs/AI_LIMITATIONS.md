# VidyaLink — AI Subsystem Limitations & Design Boundaries

## 1. Architectural Philosophy: Deterministic vs. Generative (LLM)

VidyaLink deliberately implements **deterministic, evidence-based scoring algorithms** rather than probabilistic generative LLMs for core evaluation, scoring, and recommendation decisions.

### Rationale
1. **Academic Fairness & Auditability:** Every point scored can be traced back to verified faculty approvals, repository commit counts, verifiable tech stack breadth, and genuine documentation presence.
2. **Elimination of Hallucination:** A generative LLM might invent accomplishments, inflate scores based on persuasive prose, or drift across runs. Deterministic heuristics ensure that identical evidence yields identical evaluations (`contentHash` deduplication).
3. **Reproducibility:** Faculty, recruiters, and students can review the exact breakdown (e.g. Project Complexity 25%, Tech Stack 20%, GitHub 15%, Documentation 15%, Innovation 15%, Code Quality 10%).

---

## 2. Evidence Gates & Insufficient Evidence Policies

VidyaLink strictly enforces an **Honest Zero State Policy**:
- If a student has zero verified projects, the system returns `INSUFFICIENT_EVIDENCE` and will **never** invent placeholder scores or synthetic sample projects.
- If a student has not connected their GitHub account, the system displays `Not Connected` with a score of 0 / unavailable, rather than guessing or fabricating GitHub commit activity.
- If an uploaded resume is an image scan, password-protected, or unparseable, ATS analysis returns `INSUFFICIENT_EVIDENCE` with guidance to upload a selectable text PDF.
- Recommendations return empty arrays if no live alumni or active recruiter requisitions match the student's skills, rather than showing fake mock profiles.

---

## 3. Boundary Conditions & Known Limitations

| Dimension | Scope & Boundary | Impact / Handling |
|---|---|---|
| **GitHub Analytics** | Relies on metrics synced at the time of GitHub OAuth connection (public repo count, sync timestamp). Does not execute unbounded real-time GitHub REST queries on every page reload. | Rate-limit friendly. If a student creates new repositories, they must trigger a GitHub sync to reflect them. |
| **Live Deployment Probing** | Evaluates reachability with HTTP HEAD / GET requests under a strict 8-second timeout. | If a third-party host (e.g., Render, Vercel, Heroku) is sleeping or has cold-boot delays exceeding 8 seconds, the probe marks the site unreachable until warmed up. |
| **ATS Resume Text Extraction** | Uses `pdf-parse` text stream extraction. | Multi-column complex graphical resumes or scanned bitmap PDFs may have degraded text stream ordering. The system recommends standard single-column ATS layouts. |
| **Skill Vocabulary** | Matches against a canonical dictionary of ~1,500 standard programming languages, frameworks, libraries, and tools. | Extremely niche or newly released proprietary tools may not be recognized until added to the alias dictionary. |
| **Faculty Primacy** | AI recommendations and evaluations are **strictly advisory**. | AI scores never automatically approve a student's verification request or override faculty decisions. The faculty member remains the authoritative source of truth. |

---

## 4. Privacy, Safety, and RBAC Boundaries

- **Student Privacy:** A student can only evaluate and view their own AI analysis and historical snapshots.
- **Recruiter Scoping:** A recruiter can only view AI insights for candidates who have actively submitted an application to one of the recruiter's posted opportunities. Unsolicited browsing of unevaluated student pools is blocked.
- **Observability Data Masking:** The `[AI_OBSERVABILITY]` logs record only step names, status, durations in milliseconds, and non-sensitive identifiers (`studentId`, `portfolioId`). No personal identifiable information (PII), resume text, or credentials are logged.
