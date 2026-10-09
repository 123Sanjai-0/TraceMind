import os
import json
import httpx
from typing import Dict, Any, Optional
from app.core.config import settings

class LLMProvider:
    """
    Unified LLM provider interface supporting OpenAI, Anthropic, Gemini, and deterministic local fallback.
    """

    async def generate_explanation(
        self,
        system_prompt: str,
        user_prompt: str,
        fallback_data: Dict[str, Any]
    ) -> Dict[str, Any]:
        provider = settings.LLM_PROVIDER.lower()

        if provider == "openai" and settings.OPENAI_API_KEY:
            try:
                return await self._call_openai(system_prompt, user_prompt)
            except Exception as e:
                print(f"[LLMProvider] OpenAI error: {e}, using deterministic fallback.")
        elif provider == "anthropic" and settings.ANTHROPIC_API_KEY:
            try:
                return await self._call_anthropic(system_prompt, user_prompt)
            except Exception as e:
                print(f"[LLMProvider] Anthropic error: {e}, using deterministic fallback.")
        elif provider == "gemini" and settings.GEMINI_API_KEY:
            try:
                return await self._call_gemini(system_prompt, user_prompt)
            except Exception as e:
                print(f"[LLMProvider] Gemini error: {e}, using deterministic fallback.")

        # Deterministic Grounded Fallback
        return fallback_data

    async def _call_openai(self, system_prompt: str, user_prompt: str) -> Dict[str, Any]:
        async with httpx.AsyncClient(timeout=30.0) as client:
            resp = await client.post(
                "https://api.openai.com/v1/chat/completions",
                headers={
                    "Authorization": f"Bearer {settings.OPENAI_API_KEY}",
                    "Content-Type": "application/json"
                },
                json={
                    "model": settings.LLM_MODEL_NAME or "gpt-4o-mini",
                    "response_format": {"type": "json_object"},
                    "messages": [
                        {"role": "system", "content": system_prompt},
                        {"role": "user", "content": user_prompt}
                    ],
                    "temperature": 0.2
                }
            )
            resp.raise_for_status()
            data = resp.json()
            content = data["choices"][0]["message"]["content"]
            return json.loads(content)

    async def _call_anthropic(self, system_prompt: str, user_prompt: str) -> Dict[str, Any]:
        async with httpx.AsyncClient(timeout=30.0) as client:
            resp = await client.post(
                "https://api.anthropic.com/v1/messages",
                headers={
                    "x-api-key": settings.ANTHROPIC_API_KEY,
                    "anthropic-version": "2023-06-01",
                    "Content-Type": "application/json"
                },
                json={
                    "model": "claude-3-5-sonnet-20241022",
                    "system": system_prompt,
                    "messages": [{"role": "user", "content": user_prompt}],
                    "max_tokens": 2048,
                    "temperature": 0.2
                }
            )
            resp.raise_for_status()
            data = resp.json()
            content = data["content"][0]["text"]
            # Extract JSON if enclosed in markdown code fences
            if "```json" in content:
                content = content.split("```json")[1].split("```")[0].strip()
            elif "```" in content:
                content = content.split("```")[1].split("```")[0].strip()
            return json.loads(content)

    async def _call_gemini(self, system_prompt: str, user_prompt: str) -> Dict[str, Any]:
        url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key={settings.GEMINI_API_KEY}"
        async with httpx.AsyncClient(timeout=30.0) as client:
            resp = await client.post(
                url,
                headers={"Content-Type": "application/json"},
                json={
                    "contents": [{
                        "parts": [
                            {"text": f"{system_prompt}\n\n{user_prompt}"}
                        ]
                    }],
                    "generationConfig": {
                        "response_mime_type": "application/json",
                        "temperature": 0.2
                    }
                }
            )
            resp.raise_for_status()
            data = resp.json()
            content = data["candidates"][0]["content"]["parts"][0]["text"]
            return json.loads(content)

llm_provider = LLMProvider()
