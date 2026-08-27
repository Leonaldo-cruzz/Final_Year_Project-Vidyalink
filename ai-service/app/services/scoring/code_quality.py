"""Code Quality & Hygiene Scorer.

Evaluates measurable quality indicators supplied with the portfolio, including
automated testing, test coverage, linting hygiene, CI/CD pipeline status, and repo structure.
"""

from typing import Any, Dict, List


def score_code_quality(payload: Dict[str, Any]) -> Dict[str, Any]:
    """Calculate code quality score (0-100) from verified project and repository hygiene metrics."""
    projects: List[Dict[str, Any]] = payload.get("projects") or []
    github: Dict[str, Any] = payload.get("github") or {}
    evidence: List[str] = []

    if not projects and not github:
        return {
            "score": 0.0,
            "evidence": ["No project records or repository metrics available to evaluate code quality."],
            "explanation": "Portfolio contains no measurable code quality signals.",
        }

    points = 0.0

    has_tests = False
    has_test_coverage = False
    has_lint_status = False
    has_ci_cd = False
    has_clean_structure = False
    high_coverage = False

    for proj in projects:
        code_quality_data = proj.get("codeQuality") or {}
        technologies = [str(t).lower() for t in (proj.get("technologies") or [])]
        desc = str(proj.get("description") or "").lower()

        if (
            code_quality_data.get("testStatus") == "PASSED"
            or code_quality_data.get("hasTests") is True
            or any(t in technologies for t in ["jest", "pytest", "mocha", "vitest", "junit", "cypress", "playwright"])
            or "test" in desc
        ):
            has_tests = True

        coverage = code_quality_data.get("coveragePercentage") or code_quality_data.get("testCoverage")
        if coverage is not None:
            has_test_coverage = True
            if float(coverage) >= 70.0:
                high_coverage = True

        if code_quality_data.get("lintStatus") in ["PASSED", "CLEAN", True]:
            has_lint_status = True

        if (
            code_quality_data.get("ciStatus") == "PASSED"
            or code_quality_data.get("hasCiCd") is True
            or any(t in technologies for t in ["github actions", "circleci", "travis ci", "gitlab ci"])
            or "ci/cd" in desc
        ):
            has_ci_cd = True

        if proj.get("githubRepository") or proj.get("githubUrl") or proj.get("modularStructure"):
            has_clean_structure = True

    if github.get("readmePresent") and (github.get("repositoryCount", 0) > 0 or github.get("publicRepos", 0) > 0):
        has_clean_structure = True

    # 1. Automated Testing Suite & Verification (up to 35 pts)
    if has_tests and high_coverage:
        points += 35.0
        evidence.append("Comprehensive automated test suite with >=70% test coverage verified.")
    elif has_tests and has_test_coverage:
        points += 28.0
        evidence.append("Automated test suite with recorded coverage reports verified.")
    elif has_tests:
        points += 20.0
        evidence.append("Automated test suite / test framework integration detected.")
    else:
        evidence.append("No automated test suite indicators supplied.")

    # 2. Continuous Integration / Build Automation (up to 30 pts)
    if has_ci_cd:
        points += 30.0
        evidence.append("CI/CD automated build / validation pipeline configured.")
    else:
        evidence.append("No continuous integration / automated build pipeline metadata detected.")

    # 3. Linting, Formatting & Static Hygiene (up to 20 pts)
    if has_lint_status:
        points += 20.0
        evidence.append("Automated linting hygiene / zero-warning status verified.")
    else:
        if has_clean_structure:
            points += 10.0
            evidence.append("Standard repository code layout present.")

    # 4. Project Repository Structure (up to 15 pts)
    if has_clean_structure:
        points += 15.0
        evidence.append("Structured version control management verified.")

    final_score = max(0.0, min(100.0, round(points, 2)))

    explanation = (
        f"Code quality scored at {final_score:.1f}/100 based on verified automated tests, "
        f"CI/CD automation, linting status, and repository hygiene metrics."
    )

    return {
        "score": final_score,
        "evidence": evidence,
        "explanation": explanation,
    }
