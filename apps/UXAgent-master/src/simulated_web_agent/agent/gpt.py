import asyncio
import json
import time
from pathlib import Path
from typing import Any, Dict, cast

# anthropic import for claude computer use
import anthropic
import yaml
from anthropic.types.beta import (
    BetaContentBlockParam,
    BetaTextBlock,
    BetaTextBlockParam,
    BetaToolUseBlockParam,
)

# client and model for claude compute use tool
from dotenv import load_dotenv

# from litellm import drop_params, token_counter
# CRITICAL: Disable litellm logging BEFORE importing Router
# The LoggingWorker creates an asyncio Queue bound to a specific event loop,
# which causes RuntimeError when accessed from different event loops in concurrent threads
import os
os.environ["LITELLM_LOG"] = "ERROR"
os.environ["LITELLM_DISABLE_LOGGING"] = "true"

from litellm.router import Router
import litellm

# Aggressively disable all async logging features to prevent event loop errors
try:
    litellm.suppress_debug_info = True
    litellm.set_verbose = False
    
    # Disable all async callbacks
    litellm._async_success_callback = []
    litellm._async_failure_callback = []
    litellm.success_callback = []
    litellm.failure_callback = []
    
    # Disable the logging worker entirely
    # The logging worker has a Queue that gets bound to an event loop
    if hasattr(litellm, '_logging_worker') and litellm._logging_worker is not None:
        try:
            litellm._logging_worker = None
        except Exception:
            pass
    
    # Prevent logging callback from being created
    if hasattr(litellm, 'callbacks'):
        litellm.callbacks = []
    
    # Also set the global logging level to suppress litellm logs
    import logging
    logging.getLogger("LiteLLM").setLevel(logging.ERROR)
    logging.getLogger("LiteLLM Router").setLevel(logging.ERROR)
    logging.getLogger("httpx").setLevel(logging.WARNING)
except Exception:
    pass  # Continue even if litellm config fails

from . import context

provider = "gemini"  # "openai" or "aws" or "anthropic" or "gemini"

prompt_dir = Path(__file__).parent.absolute() / "shop_prompts"

import threading

# Thread-local storage for routers
_local = threading.local()

CHAT_MODEL_LIST = [
    {
        "model_name": "openai",
        "litellm_params": {
            "model": "openai/gpt-4o-mini",
            "reasoning_effort": "minimal",
        },
    },
    {
        "model_name": "aws",
        "litellm_params": {
            "model": "bedrock/global.anthropic.claude-haiku-4-5-20251001-v1:0",
            "thinking": {
                "type": "disabled",
            },
        },
    },
    {
        "model_name": "anthropic",
        "litellm_params": {
            "model": "claude-sonnet-4-20250514",
        },
    },
    {
        "model_name": "gemini",
        "litellm_params": {
            "model": "gemini/gemini-2.0-flash",
        },
    },
    {
        "model_name": "openai_thinking",
        "litellm_params": {
            "model": "openai/gpt-4o-mini",
            "reasoning_effort": "high",
        },
    },
    {
        "model_name": "aws_thinking",
        "litellm_params": {
            "model": "bedrock/global.anthropic.claude-sonnet-4-5-20250929-v1:0",
            "thinking": {
                "type": "enabled",
                "budget_tokens": 32000,
            },
        },
    },
    {
        "model_name": "anthropic_thinking",
        "litellm_params": {
            "model": "claude-sonnet-4-20250514",
            "thinking": {
                "type": "enabled",
                "budget_tokens": 32000,
            },
        },
    },
    {
        "model_name": "gemini_thinking",
        "litellm_params": {
            "model": "gemini/gemini-2.0-flash-thinking-exp",
        },
    },
]

SLOW_CHAT_MODEL_LIST = [
    {
        "model_name": "openai",
        "litellm_params": {"model": "openai/gpt-4o", "reasoning_effort": "minimal"},
    },
    {
        "model_name": "aws",
        "litellm_params": {
            "model": "bedrock/global.anthropic.claude-sonnet-4-5-20250929-v1:0",
            "thinking": {
                "type": "disabled",
            },
        },
    },
    {
        "model_name": "anthropic",
        "litellm_params": {
            "model": "claude-sonnet-4-20250514",
        },
    },
    {
        "model_name": "gemini",
        "litellm_params": {
            "model": "gemini/gemini-2.0-flash",
        },
    },
    {
        "model_name": "openai_thinking",
        "litellm_params": {"model": "openai/gpt-4o", "reasoning_effort": "high"},
    },
    {
        "model_name": "aws_thinking",
        "litellm_params": {
            "model": "bedrock/global.anthropic.claude-sonnet-4-5-20250929-v1:0",
            "thinking": {
                "type": "enabled",
                "budget_tokens": 32000,
            },
        },
    },
    {
        "model_name": "anthropic_thinking",
        "litellm_params": {
            "model": "claude-sonnet-4-20250514",
            "thinking": {
                "type": "enabled",
                "budget_tokens": 32000,
            },
        },
    },
    {
        "model_name": "gemini_thinking",
        "litellm_params": {
            "model": "gemini/gemini-2.0-flash-thinking-exp",
        },
    },
]

GEMINI_EMBEDDING_MODEL = os.environ.get("GEMINI_EMBEDDING_MODEL", "gemini/embedding-001")

EMBED_MODEL_LIST = [
    {
        "model_name": "openai",
        "litellm_params": {"model": "openai/text-embedding-3-small"},
    },
    {
        "model_name": "aws",
        "litellm_params": {
            "model": "bedrock/cohere.embed-english-v3",
            "input_type": "search_document",
            "truncate": "END",
        },
    },
    {
        # Anthropic doesn't have embeddings, so use Gemini as fallback
        "model_name": "anthropic",
        "litellm_params": {"model": GEMINI_EMBEDDING_MODEL},
    },
    {
        "model_name": "gemini",
        "litellm_params": {"model": GEMINI_EMBEDDING_MODEL},
    },
]


def get_chat_router():
    if not hasattr(_local, "chat_router"):
        _local.chat_router = Router(model_list=CHAT_MODEL_LIST)
    return _local.chat_router


def get_slow_chat_router():
    if not hasattr(_local, "slow_chat_router"):
        _local.slow_chat_router = Router(model_list=SLOW_CHAT_MODEL_LIST)
    return _local.slow_chat_router


def get_embed_router():
    if not hasattr(_local, "embed_router"):
        _local.embed_router = Router(model_list=EMBED_MODEL_LIST)
    return _local.embed_router


load_dotenv()  # load anthropic api key from .env
anthropic_client = anthropic.Anthropic()
anthropic_model = "claude-sonnet-4-20250514"


def async_retry(times=10):
    def func_wrapper(f):
        async def wrapper(*args, **kwargs):
            wait = 1
            max_wait = 5
            last_exc = None
            for _ in range(times):
                # noinspection PyBroadException
                try:
                    return await f(*args, **kwargs)
                except Exception as exc:
                    last_exc = exc
                    print("got exc", exc)
                    await asyncio.sleep(wait)
                    wait = min(wait * 2, max_wait)
                    pass
            if last_exc:
                raise last_exc

        return wrapper

    return func_wrapper


def retry(times=10):
    def func_wrapper(f):
        def wrapper(*args, **kwargs):
            wait = 1
            max_wait = 5
            last_exc = None
            for _ in range(times):
                # noinspection PyBroadException
                try:
                    return f(*args, **kwargs)
                except Exception as exc:
                    print("got exc", exc)
                    last_exc = exc
                    # await asyncio.sleep(wait)
                    time.sleep(wait)
                    wait = min(wait * 2, max_wait)
                    pass
            if last_exc:
                raise last_exc

        return wrapper

    return func_wrapper


def _extract_json_string(text: str) -> str:
    import regex

    # Improved pattern to match JSON objects. Note: This is still not foolproof for deeply nested or complex JSON.
    json_pattern = r"\{(?:[^{}]*|(?R))*\}"
    matches = regex.findall(json_pattern, text, regex.DOTALL)
    if matches:
        return matches[0]
    else:
        raise Exception("No JSON object found in the response")


@async_retry()
async def async_chat(
    messages,
    model="small",
    json_mode=False,
    log=True,
    max_tokens=64000,
    enable_thinking=None,
    **kwargs,
):
    """
    Async chat completion that returns the string LLM output.

    For model and provider information, check the head of /src/simulated_web_agent/agent/gpt.py.

    To add your own preferred LLM for chat completion, simply add the model into each of the liteLLM routers,
    and change the provider global variable to your custom provider.

    Args:
        model: "small" for lightweight version of the model
        json_mode: whether the result should be in json deserializable
        log: whether to log the output
        max_tokens: the maximum number of tokens
        enable_thinking: whether to enable thinking, if supported (supported by bedrock and anthropic, not supported by openai)

    Returns:
        A single string object outputted by the LLM.
    """

    if context.api_call_manager.get() and log:
        context.api_call_manager.get().request.append(messages)

    router = get_chat_router() if model == "small" else get_slow_chat_router()
    call_kwargs: Dict[str, Any] = dict(**kwargs)
    if enable_thinking:
        router_model = provider + "_thinking"
    else:
        router_model = provider
    if json_mode and provider == "openai":
        call_kwargs["response_format"] = {"type": "json_object"}
    response = await router.acompletion(
        model=router_model,
        messages=messages,
        max_tokens=max_tokens,
        drop_params=True,  # do not forward unused params, such as thinking for openai
        **call_kwargs,
        tools=None,
    )
    if not response.choices:
        raise Exception(f"No choices returned from LLM. Response: {response}")
    content = response.choices[0].message.get("content", "")

    finish_reason = response.choices[0].finish_reason
    if finish_reason != "stop":
        print("finish_reason:", finish_reason)
        print("content:", content)
        print("response:", response)
    # tokens_used = token_counter(model="openai/gpt-5-mini", text=content)
    # print("Output tokens:", tokens_used)

    if context.api_call_manager.get() and log:
        context.api_call_manager.get().response.append(content)

    if json_mode:
        # Extract JSON substring from the content
        try:
            json_str = _extract_json_string(content)
            _ = json.loads(json_str)
            return json_str
        except Exception as e:
            print(e)
            print(content)
            raise Exception("Invalid JSON in response") from e
    return content


@retry()
def chat(
    messages, model="small", enable_thinking=None, json_mode=False, **kwargs
) -> str:
    """
    Returns LLM text completion given list of formatted messages.

    Args:
        model: set to "small" to use the lightweight version of the chat model.
        messages: List of previous messages
        enable_thinking: Whether to enable thinking or not. Pass in an integer for custom thinking budget.
        json_mode: Whether to enable JSON mode or not.

    Returns:
        String output of the LLM model
    """

    router = get_chat_router() if model == "small" else get_slow_chat_router()
    call_kwargs: Dict[str, Any] = dict(**kwargs)
    if enable_thinking:
        call_kwargs["thinking"] = {
            "type": "enabled",
            "budget_tokens": enable_thinking
            if isinstance(enable_thinking, int)
            else 1024,
        }
    if json_mode and provider == "openai":
        call_kwargs["response_format"] = {"type": "json_object"}

    try:
        response = router.completion(
            model=provider,
            messages=messages,
            drop_params=True,  # do not forward unused params, such as thinking for openai
            **call_kwargs,
        )
        if not response.choices:
            raise Exception(f"No choices returned from LLM. Response: {response}")
        return response.choices[0].message["content"]
    except Exception as e:
        print(messages)
        print(e)
        raise e


async def embed_text(texts: list[str]) -> list[list[float]]:
    """
    Embed a list of texts using the provider configured in /src/simulated_web_agent/agent/gpt.py

    Returns:
        List of list[float] representing each of the embedded texts
    """
    try:
        response = await get_embed_router().aembedding(model=provider, input=texts)
        return [e["embedding"] for e in response.data]
    except Exception as e:
        print(texts)
        print(e)
        raise e


def chat_anthropic_computer_use(
    messages,
    system: BetaTextBlockParam,
    model=anthropic_model,
    screen_width: int = 1024,
    screen_height: int = 768,
) -> (list[BetaToolUseBlockParam], list[Dict, Any]):
    """
    Given a system block and JSON messages, return the tool use block generated by the computer use tool
    """
    response = anthropic_client.beta.messages.create(
        model=model,
        max_tokens=1024,
        tools=[
            {
                "type": "computer_20250124",
                "name": "computer",
                "display_width_px": screen_width,
                "display_height_px": screen_height,
                "display_number": 1,
            },
            {
                "name": "web_browser",
                "description": "High-level browser controls",
                "input_schema": {
                    "type": "object",
                    "properties": {
                        "action": {
                            "type": "string",
                            "enum": [
                                "switch_tab",
                                "forward",
                                "back",
                                "new_tab",
                                "goto_url",
                                "close_tab",
                                "terminate",
                            ],
                        },
                        "tab_index": {
                            "type": "integer",
                            "minimum": 0,
                            "description": "Zero-based index for switch_tab and close_tab",
                        },
                        "url": {
                            "type": "string",
                            "description": "URL input, only required for goto_url and new_tab",
                        },
                    },
                    "required": ["action"],
                },
            },
        ],
        system=[system],
        messages=messages,
        betas=["computer-use-2025-01-24"],
    )

    return response


def chat_gemini_computer_use(
    messages,
    system_prompt: str,
    model="gemini/gemini-2.0-flash",
    screen_width: int = 1024,
    screen_height: int = 768,
):
    """
    Send messages (including images) to Gemini to simulate computer use.
    Returns a dict compatible with what the Agent expects (CUA format).
    """
    import base64
    from litellm import completion

    # Define the tool definitions for Gemini
    # Note: Gemini 2.0 Flash supports function calling
    tools = [
        {
            "type": "function",
            "function": {
                "name": "computer",
                "description": "Control the computer mouse and keyboard",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "action": {
                            "type": "string",
                            "enum": [
                                "mouse_move",
                                "left_click",
                                "left_click_drag",
                                "right_click",
                                "middle_click",
                                "double_click",
                                "screenshot",
                                "type",
                                "key",
                                "cursor_position",
                            ],
                        },
                        "coordinate": {
                            "type": "array",
                            "items": {"type": "integer"},
                            "description": "(x, y) coordinates for mouse actions",
                        },
                        "text": {"type": "string", "description": "Text to type"},
                        "key": {"type": "string", "description": "Key sequence to press (e.g. 'Enter', 'Ctrl+c')"},
                    },
                    "required": ["action"],
                },
            },
        },
         {
            "type": "function",
            "function": {
                "name": "web_browser",
                "description": "High-level browser controls",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "action": {
                            "type": "string",
                            "enum": [
                                "switch_tab",
                                "forward",
                                "back",
                                "new_tab",
                                "goto_url",
                                "close_tab",
                                "terminate",
                            ],
                        },
                        "tab_index": {
                            "type": "integer",
                            "minimum": 0,
                            "description": "Zero-based index for switch_tab and close_tab",
                        },
                        "url": {
                            "type": "string",
                            "description": "URL input, only required for goto_url and new_tab",
                        },
                    },
                    "required": ["action"],
                },
            },
        },
    ]

    # Prepend system prompt to messages if needed, or rely on 'system' role
    formatted_messages = []
    if system_prompt:
        formatted_messages.append({"role": "system", "content": system_prompt})
    
    # Process messages to handle image blocks for LiteLLM/Gemini
    for msg in messages:
        new_content = []
        if isinstance(msg.get("content"), list):
             for block in msg["content"]:
                if block.get("type") == "text":
                    new_content.append({"type": "text", "text": block["text"]})
                elif block.get("type") == "image":
                    # LiteLLM/Gemini expects inline images or URLs
                    # Assuming block["source"]["data"] is base64
                    source = block.get("source", {})
                    if source.get("type") == "base64":
                         new_content.append({
                            "type": "image_url", 
                            "image_url": {"url": f"data:image/jpeg;base64,{source['data']}"}
                        })
        elif isinstance(msg.get("content"), str):
             new_content.append({"type": "text", "text": msg["content"]})
        
        formatted_messages.append({"role": msg["role"], "content": new_content})

    # Debug: Print structure of first user message
    # try:
    #     for m in formatted_messages:
    #         if m["role"] == "user":
    #             print(f"User message content types: {[c.get('type') for c in m['content']]}")
    #             for c in m['content']:
    #                 if c.get("type") == "image_url":
    #                     url = c['image_url']['url']
    #                     print(f"Image URL start: {url[:50]}...")
    # except Exception:
    #     pass

    try:
        response = completion(
            model=model,
            messages=formatted_messages,
            tools=tools,
            tool_choice="auto",
        )
        return response
    except Exception as e:
        print(f"Gemini CUA Error: {e}")
        # Return a dummy response or raise
        raise e



def load_prompt(prompt_name):
    p = prompt_dir / f"{prompt_name}.txt"
    return open(p, "r", encoding="utf-8").read()
