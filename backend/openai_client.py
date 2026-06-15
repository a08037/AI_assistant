import os
from functools import lru_cache
from openai import OpenAI

class OpenAIInitError(RuntimeError):
    pass

@lru_cache(maxsize=1)
def get_openai_client() -> OpenAI:
    api_key = os.environ.get("OPENAI_API_KEY")
    if not api_key:
        raise OpenAIInitError("OPENAI_API_KEY is not set")
    # Таймаут на установку стрима/первый токен
    client = OpenAI(timeout=30.0)
    return client

    print("OPENAI_API_KEY =", bool(os.environ.get("OPENAI_API_KEY")))
