# VIDYALINK Recommendation Engine & Skill Gap Architecture

This document describes the evidence-backed recommendation engine, skill gap analysis, and intelligent matching system in VIDYALINK.

---

## 1. Core Principles

1. **Grounded Exclusively in Real Database Entities**: No fake, mock, or randomly generated candidates, alumni, companies, or jobs are ever produced. If no genuine match exists, the engine returns an empty list (`[]`) with transparent explanatory notes.
2. **Deterministic & Explainable**: Matching scores are calculated using deterministic mathematical formulas over canonicalized terms. `Math.random()`, Python `random`, or hardcoded dummy scores are strictly prohibited.
3. **Transparent Heuristics vs. LLM Assistance**: Core matching, skill gap calculations, and ranking use deterministic heuristics over controlled vocabularies. LLM assistance (when configured) provides secondary text summarization but never alters candidate scores or invents unverified claims.
4. **Context & Privacy Preservation**: All recommendations are strictly scoped to the authenticated student context (`req.user._id`). Students cannot query or expose another user's recommendations. Alumni and recruiters only see data in compliance with active platform relationship rules.

---

## 2. Input Signals

The matching engine extracts signals from verified, real database records:

| Signal Category | Source Model | Fields Extracted | Purpose |
| :--- | :--- | :--- | :--- |
| **Profile Skills** | `Profile` | `skills` | Baseline student skills declared on profile |
| **Project Technologies** | `Project` (via `Portfolio`) | `technologies`, `category`, `domain` | Verified project evidence technologies |
| **Project Documentation** | `Project` (via `Portfolio`) | `description`, `documentationUrl` | Contextual skill extraction via controlled vocabulary |
| **Stored Resume** | `Resume` (PDF parsed) | Extracted text content | Supporting resume skill signals |
| **Career Interests** | `Profile` | `interests` | Student's target domains and functional areas |
| **Graduation Year** | `User` / `Profile` | `graduationYear` | Cohort alignment and recent graduate mentorship relevance |
| **Verified Portfolio Score**| `AIEvaluation` | `overallScore` | Faculty-verified capstone evaluation weight (optional signal) |

---

## 3. Skill Extraction & Controlled Vocabulary

Skill extraction aggregates competencies from:
- Profile skills
- Project technologies (tagged directly by project or faculty verification)
- Project descriptions and documentation
- Resume extracted text

### Controlled Vocabulary (`SKILL_ALIASES`)
Extracted skills must match canonical aliases in `SKILL_ALIASES` (e.g. `Python`, `Node.js`, `FastAPI`, `PostgreSQL`, `Docker`, `REST APIs`, `Redis`, `React`, `TypeScript`, `SQL`, `Machine Learning`, etc.). Free-form text never creates unrecognized or fabricated skills.

### Source Preservation
Sources are tracked explicitly:
- `profile.skills`
- `project:<ProjectTitle>.technologies`
- `project:<ProjectTitle>.description`
- `resume.text`

---

## 4. Skill Gap Analysis (`POST /api/v1/skills/gap`)

### Input
- `current_skills`: Array of student's verified skills
- `required_skills`: Array of target competencies (passed explicitly or derived from a target role)
- `target_role`: Optional role name (e.g., `Backend Developer`, `Frontend Developer`, `Full Stack Developer`)

### Coverage Calculation
$$\text{Coverage Percentage} = \frac{|\text{Matched Skills}|}{|\text{Required Skills}|} \times 100$$

- **Empty Requirements**: When `required_skills` is empty and no supported role is matched, coverage is `0.0%`, with recommendation: `"Not enough information to calculate skill gap. Please specify a target role or required skills."` (Never returns a misleading 100%).
- **Matched Skills**: $\text{Required Skills} \cap \text{Student Skills}$
- **Missing Skills**: $\text{Required Skills} \setminus \text{Student Skills}$
- **Learning Recommendations**: For each missing skill, constructive recommendations are generated (e.g. `"Build evidence for Docker through a verified project, coursework, or certification."`).

---

## 5. Alumni Mentor Matching

Alumni candidates are real active users (`role: 'alumni'`, `status: 'active'`) and their corresponding `Profile` records.

### Scoring Formula
$$\text{Score} = \min(\text{SkillScore} + \text{DomainScore} + \text{CohortScore} + \text{PortfolioScore}, 100.0)$$

1. **Technical Skill Overlap** ($\le 55.0$ pts):
   $$\text{SkillScore} = \min(|\text{StudentSkills} \cap \text{AlumniSkills}| \times 15.0, 55.0)$$
2. **Domain / Career Interest Alignment** ($\le 25.0$ pts):
   $$\text{DomainScore} = \min(|\text{StudentInterests} \cap \text{AlumniInterests}| \times 12.5, 25.0)$$
3. **Graduation Cohort Relevance** ($\le 10.0$ pts):
   - Difference $\le 5$ years: $+10.0$ pts (recent graduate peer mentor)
   - Difference $\le 10$ years: $+5.0$ pts
   - Difference $> 10$ years: $+2.0$ pts
   - If either year is missing: $0.0$ pts (no penalty applied)
4. **Portfolio Compatibility** ($\le 10.0$ pts):
   $$\text{PortfolioScore} = \left(\frac{\text{Student Portfolio Score}}{100.0}\right) \times 10.0$$

### Filtering & Zero Overlap Rule
If an alumni candidate has **zero matching skills** and **zero matching domains**, they are omitted from the recommendation response. No candidates are recommended without genuine evidence overlap.

### Explanation Output
- `alumniId`: MongoDB ObjectId of the alumni user
- `matchScore`: Deterministic score (0–100)
- `matchedSignals`: List of human-readable signals (e.g. `["3 matching technical skills (Python, Docker, SQL)", "Matching domain/career interest (Backend)", "Relevant graduating cohort (2022)"]`)
- `reason`: Descriptive explanation starting with `"Recommended because of..."`

---

## 6. Recruiter Opportunity Matching

Opportunity candidates are real active `Project` documents authored by users with `role: 'recruiter'` (`projectStatus != 'Archived'`, `verificationStatus != 'Rejected'`).

### Scoring Formula
$$\text{Score} = \min(\text{SkillScore} + \text{DomainScore} + \text{PortfolioScore}, 100.0)$$

1. **Required Skill Coverage** ($\le 60.0$ pts):
   $$\text{SkillScore} = \left(\frac{|\text{StudentSkills} \cap \text{OpportunitySkills}|}{|\text{OpportunitySkills}|}\right) \times 60.0$$
2. **Domain & Category Alignment** ($\le 25.0$ pts):
   $$\text{DomainScore} = \min(|\text{StudentInterests} \cap \text{OpportunityDomains}| \times 15.0, 25.0)$$
3. **Portfolio Quality Signal** ($\le 15.0$ pts):
   $$\text{PortfolioScore} = \left(\frac{\text{Student Portfolio Score}}{100.0}\right) \times 15.0$$

### Candidate Diagnostics
- `opportunityId`: Project document identifier
- `matchScore`: Deterministic score (0–100)
- `matchedSkills`: Subset of required skills the student already possesses
- `missingSkills`: Competencies the opportunity requires which the student can develop
- `matchedSignals`: List of matching evidence signals
- `reason`: Explainable justification starting with `"Recommended because it..."`

---

## 7. API Specification

### `GET /api/v1/ai/recommendations` & `POST /api/v1/ai/recommendations`
- **Authentication**: Bearer JWT (`authenticate` middleware)
- **Authorization**: `student` role only
- **Response Format**:
  ```json
  {
    "success": true,
    "message": "Recommendations generated from supplied records",
    "data": {
      "skills": [
        {
          "skill": "Docker",
          "priority": "high",
          "reason": "Listed as target skill but not yet evidenced in student profile or verified projects"
        }
      ],
      "alumni": [
        {
          "alumniId": "651a2f...",
          "name": "Priya Patel",
          "title": "Senior Backend Engineer",
          "organization": "TechLabs",
          "matchScore": 75.0,
          "matchedSignals": [
            "2 matching technical skills (Python, PostgreSQL)",
            "Matching domain/career interest (Web Development)"
          ],
          "matchedSkills": ["Python", "PostgreSQL"],
          "reason": "Recommended because of strong overlap in Python, PostgreSQL and shared interests in Web Development."
        }
      ],
      "opportunities": [
        {
          "opportunityId": "652b3e...",
          "name": "Backend Microservices Intern",
          "title": "Cloud Computing",
          "organization": "CloudScale Inc",
          "matchScore": 82.5,
          "matchedSkills": ["Python", "FastAPI"],
          "missingSkills": ["Docker", "Kubernetes"],
          "matchedSignals": [
            "2 required skills matched (Python, FastAPI)",
            "2 skills to develop (Docker, Kubernetes)",
            "Matching domain (Cloud Computing)"
          ],
          "reason": "Recommended because it matches required skills (FastAPI, Python); offers opportunity to develop Docker, Kubernetes."
        }
      ],
      "notes": [
        "Recommendations are ranked only from actual candidate records supplied in this request.",
        "No external people, employers, or opportunities were invented."
      ]
    }
  }
  ```

---

## 8. Missing Data Behavior

| Scenario | System Behavior |
| :--- | :--- |
| **Student has no skills entered** | Returns `"No skill recommendations yet. Add your skills to improve matching."` |
| **No project evidence** | Project-derived technology signals remain empty without fabricating defaults. |
| **No career interests** | Domain alignment score yields $0.0$; prompt suggests adding interests. |
| **No alumni records overlap** | `alumni` returns `[]`; note: `"No matching alumni found based on current skills and interests."` |
| **No recruiter opportunities overlap** | `opportunities` returns `[]`; note: `"No matching opportunities available based on current skills."` |

---

## 9. Security & Access Control

- **Student Context Scoping**: The student identity is derived strictly from `req.user._id`. Querying or submitting arbitrary `studentId` payloads by a student will trigger `403 Forbidden` (`Students may only analyze their own records`).
- **Data Protection**: Alumni contact details (phone, email) are omitted from recommendation candidate structures; only public institutional profiles and headlines are utilized.
- **Recruiter Candidate Access**: Recruiters may only access unified candidate AI assessments for students who have actively applied to their posted projects.
