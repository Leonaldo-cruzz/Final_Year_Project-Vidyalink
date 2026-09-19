"""Deterministic scoring helpers shared by services."""


def clamp(value: float, minimum: float = 0.0, maximum: float = 100.0) -> float:
    return max(minimum, min(maximum, float(value)))


def rounded(value: float) -> float:
    return round(clamp(value), 2)


def category_for_score(score: float) -> str:
    score = clamp(score)
    if score >= 90:
        return "Excellent"
    if score >= 80:
        return "Very Good"
    if score >= 70:
        return "Good"
    if score >= 60:
        return "Average"
    return "Needs Improvement"


def weighted_average(values: dict[str, float], weights: dict[str, float]) -> float:
    """Calculate a weighted average using only supplied values."""
    available = [(key, value, weights[key]) for key, value in values.items() if key in weights and value is not None]
    total_weight = sum(weight for _, _, weight in available)
    if not total_weight:
        return 0.0
    return sum(value * weight for _, value, weight in available) / total_weight

