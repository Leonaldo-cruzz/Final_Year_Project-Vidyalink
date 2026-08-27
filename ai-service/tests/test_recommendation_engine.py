from app.services.recommendation.alumni_matcher import match_alumni
from app.services.recommendation.improvement_recommender import recommend_improvements
from app.services.recommendation.matching import missing, normalize_term, overlap
from app.services.recommendation.recruiter_matcher import match_recruiter_opportunities


def student(**overrides):
    value = {
        "studentId": "student-1",
        "skills": ["React", "Node.js"],
        "skillGaps": [],
        "projects": [],
        "interests": ["Web Development"],
        "domains": ["Web Development"],
        "portfolioScore": 80,
        "atsScore": None,
        "githubScore": 60,
        "experienceYears": 1,
        "verificationEvidence": True,
        "evidence": {},
    }
    value.update(overrides)
    return value


def alumni(**overrides):
    value = {
        "entityId": "alumni-1",
        "expertise": ["React", "Node.js"],
        "domains": ["Web Development"],
        "interests": ["Web Development"],
        "experienceYears": 5,
        "verified": True,
        "active": True,
        "visible": True,
    }
    value.update(overrides)
    return value


def opportunity(**overrides):
    value = {
        "entityId": "opportunity-1",
        "requiredSkills": ["React", "Node.js"],
        "preferredSkills": ["Docker"],
        "domains": ["Web Development"],
        "minimumExperienceYears": 0,
        "verified": True,
        "active": True,
        "visible": True,
    }
    value.update(overrides)
    return value


def test_exact_skill_match_is_explainable():
    result = match_alumni(student(), [alumni()])
    assert result[0]["matchedSkills"] == ["node.js", "react"]
    assert result[0]["matchScore"] > 80
    assert result[0]["reasons"]


def test_partial_skill_match_and_missing_skills():
    result = match_recruiter_opportunities(student(skills=["React"]), [opportunity()])
    assert result[0]["matchedSkills"] == ["react"]
    assert result[0]["missingSkills"] == ["node.js"]


def test_alias_normalization():
    assert normalize_term("ReactJS") == "react"
    assert normalize_term("Node JS") == "node.js"
    assert overlap(["ReactJS"], ["react"]) == ["react"]
    assert missing(["Mongo DB"], ["MongoDB"]) == []


def test_domain_and_interest_matching_affect_alumni_score():
    domain_match = match_alumni(student(skills=[]), [alumni(expertise=[], interests=[])])[0]
    no_match = match_alumni(student(skills=[], interests=[], domains=[]), [alumni(expertise=[], interests=[])])
    assert domain_match["matchScore"] > 0
    assert no_match == []


def test_verified_and_active_alumni_filtering():
    results = match_alumni(student(), [alumni(entityId="unverified", verified=False), alumni(entityId="inactive", active=False)])
    assert results == []


def test_recruiter_results_are_ranked_and_repeatable():
    opportunities = [opportunity(entityId="b", requiredSkills=["React"]), opportunity(entityId="a", requiredSkills=["React"])]
    first = match_recruiter_opportunities(student(skills=["React"]), opportunities)
    second = match_recruiter_opportunities(student(skills=["React"]), opportunities)
    assert [{key: value for key, value in item.items() if key != "generatedAt"} for item in first] == [{key: value for key, value in item.items() if key != "generatedAt"} for item in second]
    assert [item["entityId"] for item in first] == ["a", "b"]


def test_improvements_require_evidence_and_cover_empty_portfolio():
    results = recommend_improvements(student(skills=[], portfolioScore=0, evidence={"projectCount": 0, "hasResume": False, "githubConnected": False, "verifiedCertificateCount": 0}))
    assert any(item["entityId"] == "project:portfolio-foundation" for item in results)
    assert any(item["type"] == "RESUME_IMPROVEMENT" for item in results)


def test_improvements_do_not_invent_deficiencies():
    results = recommend_improvements(student(evidence={"projectCount": 1, "undocumentedProjectCount": 0, "projectEvidenceMissingCount": 0, "hasResume": True, "githubConnected": True, "githubPublicRepos": 1, "verifiedCertificateCount": 1}))
    assert results == []


def test_recommendations_do_not_contain_private_candidate_fields():
    result = match_alumni(student(), [alumni(email="private@example.com", phone="9999999999")])[0]
    assert "email" not in result
    assert "phone" not in result
