"""Innovation & Problem-Solving Scorer.

Evaluates domain specificity, technical integration depth, non-trivial workflows,
domain problem complexity, and originality indicators based on verified metadata.
"""

from typing import Any, Dict, List, Set


def score_innovation(payload: Dict[str, Any]) -> Dict[str, Any]:
    """Calculate innovation & problem-solving score (0-100) from verified project metadata."""
    projects: List[Dict[str, Any]] = payload.get("projects") or []
    evidence: List[str] = []

    if not projects:
        return {
            "score": 0.0,
            "evidence": ["No verified projects available to evaluate innovation."],
            "explanation": "Portfolio contains no project metadata to evaluate problem specificity or innovation.",
        }

    points = 0.0

    specialized_domains: Set[str] = set()
    advanced_integrations: Set[str] = set()
    has_live_solution = False
    has_real_world_context = False
    has_custom_workflow = False

    integration_signals = {
        "websocket": "Real-time WebSockets communication",
        "socket.io": "Real-time bidirectional event streaming",
        "stripe": "Secure payment processing integration",
        "razorpay": "Payment gateway processing",
        "redis": "High-throughput caching / pub-sub layer",
        "docker": "Containerized multi-service deployment",
        "ai": "Artificial Intelligence / ML integration",
        "openai": "LLM intelligence pipeline",
        "gemini": "LLM intelligence pipeline",
        "nlp": "Natural Language Processing workflow",
        "oauth": "Federated third-party identity authentication",
        "webrtc": "Peer-to-peer real-time media streaming",
        "graphql": "Flexible data graph API layer",
        "microservices": "Distributed service architecture",
    }

    domain_keywords = {
        "fintech": "Financial Technology",
        "health": "Healthcare / Medical",
        "edtech": "Educational Technology",
        "cybersecurity": "Security & Cryptography",
        "e-commerce": "E-Commerce Systems",
        "ai/ml": "AI / Machine Learning",
        "iot": "Internet of Things",
        "developer tools": "Developer Productivity / Tooling",
    }

    for proj in projects:
        title = str(proj.get("title") or "").lower()
        desc = str(proj.get("description") or "").lower()
        detailed_desc = str(proj.get("detailedDescription") or "").lower()
        category = str(proj.get("category") or "").lower()
        domain = str(proj.get("domain") or "").lower()
        techs = [str(t).lower() for t in (proj.get("technologies") or [])]
        combined = f"{title} {desc} {detailed_desc} {category} {domain} {' '.join(techs)}"

        for d_key, d_name in domain_keywords.items():
            if d_key in combined:
                specialized_domains.add(d_name)

        for sig_key, sig_name in integration_signals.items():
            if sig_key in combined:
                advanced_integrations.add(sig_name)

        if proj.get("liveDeployment") or proj.get("liveUrl"):
            has_live_solution = True

        if len(detailed_desc) > 100 or "problem" in combined or "solution" in combined:
            has_real_world_context = True

        if "algorithm" in combined or "pipeline" in combined or "automated" in combined or "analytics" in combined:
            has_custom_workflow = True

    # 1. Problem Specificity & Real-World Domain Application (up to 30 pts)
    if specialized_domains:
        domain_pts = min(30.0, len(specialized_domains) * 15.0)
        points += domain_pts
        evidence.append(f"Specialized domain focus verified in: {', '.join(specialized_domains)}.")
    elif has_real_world_context:
        points += 15.0
        evidence.append("Real-world problem statement and functional solution context identified.")
    else:
        points += 8.0
        evidence.append("General application development focus.")

    # 2. Non-Trivial Technical Integrations (up to 30 pts)
    if len(advanced_integrations) >= 3:
        points += 30.0
        evidence.append(f"High integration depth ({len(advanced_integrations)} complex subsystems: {', '.join(list(advanced_integrations)[:3])}).")
    elif len(advanced_integrations) >= 1:
        points += 18.0
        evidence.append(f"Advanced system capability integrated ({', '.join(advanced_integrations)}).")
    else:
        evidence.append("Standard application architecture with basic CRUD workflows.")

    # 3. Custom Algorithmic / Workflow Depth (up to 20 pts)
    if has_custom_workflow:
        points += 20.0
        evidence.append("Custom workflow, automated processing, or algorithmic feature pipeline detected.")
    else:
        points += 5.0

    # 4. Verified Working Implementation / Deployment Impact (up to 20 pts)
    if has_live_solution:
        points += 20.0
        evidence.append("Deployed working solution provides verifiable live user impact.")
    else:
        points += 5.0

    final_score = max(0.0, min(100.0, round(points, 2)))

    explanation = (
        f"Innovation and technical depth scored at {final_score:.1f}/100 based on problem "
        f"domain specificity, advanced subsystem integrations, custom logic, and live implementation."
    )

    return {
        "score": final_score,
        "evidence": evidence,
        "explanation": explanation,
    }
