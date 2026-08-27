"""Documentation Quality Scorer.

Evaluates presence, clarity, and structural depth of project documentation,
including README, setup instructions, architecture docs, API docs, usage guides, and demos.
"""

from typing import Any, Dict, List


def score_documentation_quality(payload: Dict[str, Any]) -> Dict[str, Any]:
    """Calculate documentation quality score (0-100) from project & documentation metadata."""
    projects: List[Dict[str, Any]] = payload.get("projects") or []
    evidence: List[str] = []

    if not projects:
        return {
            "score": 0.0,
            "evidence": ["No verified projects available to assess documentation."],
            "explanation": "Portfolio contains no project documentation records.",
        }

    points = 0.0

    has_readme = False
    has_setup = False
    has_arch_docs = False
    has_api_docs = False
    has_usage_guide = False
    has_doc_url = False
    has_demo_video = False
    has_detailed_desc = False

    for proj in projects:
        desc = str(proj.get("description") or "")
        detailed_desc = str(proj.get("detailedDescription") or "")
        doc_fields = proj.get("documentation") or {}
        if isinstance(doc_fields, str):
            doc_fields = {"readme": doc_fields}

        if proj.get("documentationUrl") or proj.get("docsUrl"):
            has_doc_url = True

        if proj.get("demoVideo") or proj.get("videoDemoUrl"):
            has_demo_video = True

        if len(detailed_desc) > 150 or len(desc) > 150:
            has_detailed_desc = True

        readme = doc_fields.get("readme") or proj.get("readme") or proj.get("readmePresent")
        if readme:
            has_readme = True

        setup = doc_fields.get("setupInstructions") or proj.get("setupInstructions") or ("setup" in desc.lower()) or ("install" in desc.lower())
        if setup:
            has_setup = True

        arch = doc_fields.get("architectureDocumentation") or proj.get("architectureDocs") or ("architecture" in desc.lower())
        if arch:
            has_arch_docs = True

        api_doc = doc_fields.get("apiDocumentation") or proj.get("apiDocs") or ("api" in desc.lower() and "endpoint" in desc.lower())
        if api_doc:
            has_api_docs = True

        usage = doc_fields.get("usageDocumentation") or proj.get("usageDocs") or ("usage" in desc.lower())
        if usage:
            has_usage_guide = True

    # 1. Project Overview & Comprehensive Description (up to 20 pts)
    if has_detailed_desc:
        points += 20.0
        evidence.append("Comprehensive, structured project descriptions and problem statements provided.")
    else:
        points += 8.0
        evidence.append("Basic project description present.")

    # 2. README & Setup / Installation Instructions (up to 25 pts)
    if has_readme and has_setup:
        points += 25.0
        evidence.append("Complete README and explicit setup/installation instructions verified.")
    elif has_readme or has_setup:
        points += 15.0
        evidence.append("Standard project README or installation outline provided.")
    else:
        evidence.append("Missing dedicated project README / setup instructions.")

    # 3. Architecture & Technical Design (up to 20 pts)
    if has_arch_docs:
        points += 20.0
        evidence.append("System architecture / technical design documentation supplied.")
    else:
        evidence.append("No explicit architecture or component design documentation detected.")

    # 4. API Documentation & Interface Contracts (up to 20 pts)
    if has_api_docs:
        points += 20.0
        evidence.append("API documentation with endpoints/schemas detailed.")
    else:
        evidence.append("No formal API documentation detected.")

    # 5. External Documentation Portal / Live Walkthrough (up to 15 pts)
    if has_doc_url:
        points += 10.0
        evidence.append("Dedicated documentation portal/site URL linked.")
    if has_demo_video:
        points += 5.0
        evidence.append("Interactive video demonstration walkthrough linked.")
    if has_usage_guide and not has_doc_url:
        points += 5.0
        evidence.append("Usage and execution instructions documented.")

    final_score = max(0.0, min(100.0, round(points, 2)))

    explanation = (
        f"Documentation quality scored at {final_score:.1f}/100 based on README presence, "
        f"setup guides, architecture clarity, API specifications, and walk-through resources."
    )

    return {
        "score": final_score,
        "evidence": evidence,
        "explanation": explanation,
    }
