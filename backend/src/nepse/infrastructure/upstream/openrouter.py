"""OpenRouter API client with ultra-low token telemetry, rate handling, and cost estimation."""
import json
import logging
import os
from dataclasses import dataclass
from typing import Any
import httpx

log = logging.getLogger("nepse.openrouter")

OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions"

# Cost per 1M tokens in USD (Input / Output)
MODEL_PRICING: dict[str, tuple[float, float]] = {
    "deepseek/deepseek-chat": (0.14, 0.28),
    "deepseek/deepseek-r1": (0.55, 2.19),
    "google/gemini-2.5-flash": (0.075, 0.30),
    "meta-llama/llama-3.3-70b-instruct": (0.12, 0.30),
    "anthropic/claude-3.5-haiku": (0.80, 4.00),
}


@dataclass
class OpenRouterResult:
    content: str
    parsed_json: dict[str, Any] | None
    model: str
    prompt_tokens: int
    completion_tokens: int
    total_tokens: int
    cost_usd: float
    success: bool
    error: str | None = None


def estimate_cost(model: str, prompt_tokens: int, completion_tokens: int) -> float:
    inp_rate, out_rate = MODEL_PRICING.get(model, (0.15, 0.35))
    return round((prompt_tokens * inp_rate + completion_tokens * out_rate) / 1_000_000, 6)


def clean_json_str(raw: str) -> str:
    cleaned = raw.strip()
    if cleaned.startswith("```json"):
        cleaned = cleaned[7:]
    elif cleaned.startswith("```"):
        cleaned = cleaned[3:]
    if cleaned.endswith("```"):
        cleaned = cleaned[:-3]
    cleaned = cleaned.strip()
    first_b = cleaned.find("{")
    last_b = cleaned.rfind("}")
    if first_b != -1 and last_b != -1 and last_b > first_b:
        cleaned = cleaned[first_b : last_b + 1]
    return cleaned


class OpenRouterClient:
    def __init__(self, api_key: str | None = None, site_url: str = "https://nepseanalytics.com", app_name: str = "NEPSE Analytics"):
        self.api_key = api_key or os.getenv("OPENROUTER_API_KEY", "").strip()
        self.site_url = site_url
        self.app_name = app_name

    async def complete(
        self,
        messages: list[dict[str, str]],
        model: str = "deepseek/deepseek-chat",
        temperature: float = 0.1,
        max_tokens: int = 2048,
        enforce_json: bool = True,
        timeout_sec: float = 40.0,
    ) -> OpenRouterResult:
        if not self.api_key:
            return OpenRouterResult(
                content="",
                parsed_json=None,
                model=model,
                prompt_tokens=0,
                completion_tokens=0,
                total_tokens=0,
                cost_usd=0.0,
                success=False,
                error="OpenRouter API key is not configured.",
            )

        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "HTTP-Referer": self.site_url,
            "X-Title": self.app_name,
            "Content-Type": "application/json",
        }

        body: dict[str, Any] = {
            "model": model,
            "messages": messages,
            "temperature": temperature,
            "max_tokens": max_tokens,
        }
        if enforce_json:
            body["response_format"] = {"type": "json_object"}

        try:
            async with httpx.AsyncClient(timeout=timeout_sec) as client:
                res = await client.post(OPENROUTER_URL, headers=headers, json=body)
                if res.status_code != 200:
                    err_msg = f"OpenRouter returned status {res.status_code}: {res.text}"
                    log.error(err_msg)
                    return OpenRouterResult(
                        content="",
                        parsed_json=None,
                        model=model,
                        prompt_tokens=0,
                        completion_tokens=0,
                        total_tokens=0,
                        cost_usd=0.0,
                        success=False,
                        error=err_msg,
                    )

                data = res.json()
                choice = data.get("choices", [{}])[0]
                message = choice.get("message", {})
                content = message.get("content", "").strip()

                usage = data.get("usage", {})
                p_tokens = usage.get("prompt_tokens", 0)
                c_tokens = usage.get("completion_tokens", 0)
                tot_tokens = usage.get("total_tokens", p_tokens + c_tokens)
                cost = estimate_cost(model, p_tokens, c_tokens)

                parsed: dict[str, Any] | None = None
                try:
                    parsed = json.loads(clean_json_str(content))
                except Exception as je:
                    log.warning("Failed to parse JSON from OpenRouter output: %s", je)

                return OpenRouterResult(
                    content=content,
                    parsed_json=parsed,
                    model=model,
                    prompt_tokens=p_tokens,
                    completion_tokens=c_tokens,
                    total_tokens=tot_tokens,
                    cost_usd=cost,
                    success=True,
                )
        except Exception as e:
            log.exception("OpenRouter network error: %s", e)
            return OpenRouterResult(
                content="",
                parsed_json=None,
                model=model,
                prompt_tokens=0,
                completion_tokens=0,
                total_tokens=0,
                cost_usd=0.0,
                success=False,
                error=str(e),
            )
