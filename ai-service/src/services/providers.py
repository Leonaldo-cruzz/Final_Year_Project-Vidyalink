"""Optional provider abstraction; deterministic behavior remains the default."""

from __future__ import annotations

from abc import ABC, abstractmethod


class AIProvider(ABC):
    @abstractmethod
    def explain(self, topic: str, factual_context: dict) -> str:
        """Produce wording from supplied facts without changing the facts."""


class DeterministicProvider(AIProvider):
    def explain(self, topic: str, factual_context: dict) -> str:
        facts = ", ".join(f"{key}={value}" for key, value in factual_context.items())
        return f"{topic}: {facts}" if facts else f"{topic}: insufficient supplied evidence."


class GeminiProvider(DeterministicProvider):
    """Reserved extension point. Live calls are intentionally not required."""


class OpenAIProvider(DeterministicProvider):
    """Reserved extension point. Live calls are intentionally not required."""


def get_provider(name: str) -> AIProvider:
    # External providers can be wired here without allowing them to mutate
    # factual scoring or operate when credentials are absent.
    providers = {
        "deterministic": DeterministicProvider,
        "gemini": GeminiProvider,
        "openai": OpenAIProvider,
    }
    return providers.get(name.casefold(), DeterministicProvider)()

