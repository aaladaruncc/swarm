# app.py
import os
import logging
import json
import aiohttp
import asyncio
from functools import wraps
from flask import Flask, jsonify, request
from werkzeug.exceptions import BadRequest
from flask_cors import CORS

from .run import run  # your run() from the module you showed

app = Flask(__name__)
CORS(app)  # Enable CORS for all routes

# Centralized Logging Configuration
logging.basicConfig(
    level=logging.INFO,
    format="[%(asctime)s] %(levelname)s in %(module)s: %(message)s"
)
logging.getLogger("LiteLLM").setLevel(logging.WARNING)
logging.getLogger("LiteLLM Router").setLevel(logging.WARNING)

# Disable litellm async logging to prevent event loop errors
try:
    import litellm
    litellm.suppress_debug_info = True
    litellm._async_success_callback = []
    litellm._async_failure_callback = []
except ImportError:
    pass

# API Key authentication
INTERNAL_API_KEY = os.environ.get("INTERNAL_API_KEY")
MAIN_API_URL = os.environ.get("MAIN_API_URL", "")
MAIN_API_KEY = os.environ.get("MAIN_API_KEY", "")


def require_api_key(f):
    """Decorator to require API key authentication for endpoints"""
    @wraps(f)
    def decorated(*args, **kwargs):
        # Skip auth if no key is configured (local dev mode)
        if not INTERNAL_API_KEY:
            return f(*args, **kwargs)
        
        api_key = request.headers.get("X-API-Key")
        if not api_key:
            return jsonify({"error": "Missing X-API-Key header"}), 401
        
        if api_key != INTERNAL_API_KEY:
            return jsonify({"error": "Invalid API key"}), 403
        
        return f(*args, **kwargs)
    return decorated


# Friendly labels + simple state (latest counts per phase)
PHASE_LABELS = {
    "personas": "Generating personas",
    "agents": "Running agents",
    "surveys": "Filling surveys",
    "all": "All tasks",
}
progress_state = {
    "last_phase": None,
    "counts": {
        "personas": {"current": 0, "total": 0},
        "agents": {"current": 0, "total": 0},
        "surveys": {"current": 0, "total": 0},
    },
}


def _format_progress() -> dict:
    phase = progress_state["last_phase"]
    if not phase:
        return {"status": "idle", "message": "No run started yet."}

    c = progress_state["counts"].get(phase, {"current": 0, "total": 0})
    label = PHASE_LABELS.get(phase, phase.title())
    return {
        "phase": phase,
        "label": label,
        "current": c.get("current", 0),
        "total": c.get("total", 0),
        "message": f"{label}: {c.get('current', 0)}/{c.get('total', 0)}",
    }


def _print_compact(phase: str):
    label = PHASE_LABELS.get(phase, phase.title())
    c = progress_state["counts"].get(phase, {"current": 0, "total": 0})
    current, total = c.get("current", 0), c.get("total", 0)
    print(f"[PROGRESS] {label}: {current}/{total}", flush=True)


def log_progress(evt: dict):
    # evt looks like: {"phase":"agents","status":"progress","current":k,"total":n}
    phase = evt.get("phase")
    status = evt.get("status")

    if phase in progress_state["counts"]:
        # update totals/currents if present
        if "total" in evt:
            progress_state["counts"][phase]["total"] = evt["total"]
        if status == "start":
            # initialize current to 0 at start
            progress_state["counts"][phase]["current"] = 0
        if "current" in evt:
            progress_state["counts"][phase]["current"] = evt["current"]

        progress_state["last_phase"] = phase
        _print_compact(phase)

    elif phase == "all" and status == "done":
        print("[PROGRESS] ✅ Done.", flush=True)
    else:
        # unknown/misc event — still show something if helpful
        print(f"[PROGRESS] {evt}", flush=True)


async def send_results_to_callback(callback_url: str, api_key: str, run_data: dict):
    """Send run results to the callback URL (main API)"""
    try:
        async with aiohttp.ClientSession() as session:
            async with session.post(
                callback_url,
                json=run_data,
                headers={
                    "Content-Type": "application/json",
                    "X-API-Key": api_key,
                },
                timeout=aiohttp.ClientTimeout(total=60),
            ) as response:
                if response.status != 200:
                    text = await response.text()
                    print(f"[CALLBACK] Failed to send results: {response.status} - {text}", flush=True)
                else:
                    print(f"[CALLBACK] Results sent successfully", flush=True)
    except Exception as e:
        print(f"[CALLBACK] Error sending results: {e}", flush=True)


async def send_agent_result(callback_url: str, api_key: str, agent_data: dict, test_run_id: str = None):
    """Send a single agent's result to the callback URL"""
    memories = agent_data.get("memories", []) or []
    memory_trace = []
    for m in memories:
        if hasattr(m, "__json__"):
            try:
                memory_trace.append(m.__json__())
                continue
            except Exception:
                pass
        memory_trace.append(m)

    payload = {
        "runId": agent_data.get("run_id"),
        "intent": agent_data.get("intent"),
        "startUrl": agent_data.get("start_url"),
        "testRunId": test_run_id,
        "personaData": agent_data.get("persona_info"),
        "status": "failed" if agent_data.get("error") else ("completed" if agent_data.get("terminated") else "completed"),
        "score": agent_data.get("score"),
        "terminated": agent_data.get("terminated", False),
        "basicInfo": {
            "persona": agent_data.get("persona"),
            "intent": agent_data.get("intent"),
            "timing_metrics": agent_data.get("timing_metrics", {}),
        },
        "actionTrace": agent_data.get("actions", []),
        "memoryTrace": memory_trace,
        "observationTrace": agent_data.get("observations", []),
        "logContent": agent_data.get("final_memory_text"),
        "stepsTaken": agent_data.get("steps_taken"),
        "screenshots": [
            {
                "stepNumber": s.get("step"),
                "base64Data": s.get("base64"),
            }
            for s in agent_data.get("screenshots", [])
        ],
        "error": agent_data.get("error"),
    }
    
    await send_results_to_callback(callback_url, api_key, payload)


@app.post("/run")
@require_api_key
def run_endpoint():
    # Get callback info from headers or env
    callback_url = request.headers.get("X-Callback-URL") or f"{MAIN_API_URL}/api/uxagent/runs"
    callback_api_key = request.headers.get("X-Callback-API-Key") or MAIN_API_KEY
    user_id = request.headers.get("X-User-ID")
    test_run_id = request.headers.get("X-Test-Run-ID")
    
    # Parse JSON body
    payload = request.get_json(silent=True)
    if payload is None:
        raise BadRequest("Expected application/json body")

    # Minimal required fields (raise 400 if missing)
    required = [
        "total_personas",
        "demographics",
        "general_intent",
        "start_url",
        "max_steps",
        "questionnaire",
    ]
    missing = [k for k in required if k not in payload]
    if missing:
        raise BadRequest(f"Missing required fields: {', '.join(missing)}")

    # Optional flags with defaults
    headless = bool(payload.get("headless", True))
    use_stagehand = payload.get("use_stagehand")
    use_cua = payload.get("use_cua")
    enable_human_behavior = payload.get("enable_human_behavior")
    stagehand_skip_observe = payload.get("stagehand_skip_observe")
    stagehand_use_extract = payload.get("stagehand_use_extract")
    stagehand_observe_timeout = payload.get("stagehand_observe_timeout_seconds")
    
    # Generate a unique run ID for tracking
    import uuid
    from datetime import datetime
    run_id = f"{datetime.now().strftime('%Y-%m-%d_%H-%M-%S')}_{uuid.uuid4().hex[:4]}"

    def background_run():
        """Run the agent pipeline in background and send results via callback"""
        try:
            print(f"[RUN {run_id}] Starting background agent run...", flush=True)

            if use_stagehand is not None:
                os.environ["USE_STAGEHAND"] = "true" if use_stagehand else "false"
            if use_cua is not None:
                os.environ["USE_CUA"] = "true" if use_cua else "false"
            if enable_human_behavior is not None:
                os.environ["ENABLE_HUMAN_BEHAVIOR"] = "true" if enable_human_behavior else "false"
            if stagehand_skip_observe is not None:
                os.environ["STAGEHAND_SKIP_OBSERVE"] = "true" if stagehand_skip_observe else "false"
            if stagehand_use_extract is not None:
                os.environ["STAGEHAND_USE_EXTRACT"] = "true" if stagehand_use_extract else "false"
            if stagehand_observe_timeout is not None:
                os.environ["STAGEHAND_OBSERVE_TIMEOUT_SECONDS"] = str(stagehand_observe_timeout)
            
            # Call the pipeline
            result = run(
                total_personas=int(payload["total_personas"]),
                demographics=payload["demographics"],
                general_intent=payload["general_intent"],
                start_url=payload["start_url"],
                max_steps=int(payload["max_steps"]),
                concurrency=int(payload.get("concurrency", 4)),
                example_persona=payload.get("example_persona", None),
                questionnaire=payload["questionnaire"],
                headless=headless,
                on_progress=log_progress,
            )
            
            print(f"[RUN {run_id}] Agent run completed, sending results...", flush=True)
            
            # Send each agent result to the callback
            if callback_url and callback_api_key:
                for agent_result in result.get("agent_results", []):
                    try:
                        asyncio.run(send_agent_result(
                            callback_url=callback_url,
                            api_key=callback_api_key,
                            agent_data=agent_result,
                            test_run_id=test_run_id,
                        ))
                    except Exception as e:
                        print(f"[RUN {run_id}] Error sending agent result: {e}", flush=True)
            
            print(f"[RUN {run_id}] All results sent successfully", flush=True)
                        
        except Exception as e:
            print(f"[RUN {run_id}] Background run failed: {e}", flush=True)
            # Send error notification via callback
            if callback_url and callback_api_key:
                try:
                    asyncio.run(send_results_to_callback(
                        callback_url=callback_url,
                        api_key=callback_api_key,
                        run_data={
                            "runId": run_id,
                            "intent": payload.get("general_intent", ""),
                            "startUrl": payload.get("start_url", ""),
                            "testRunId": test_run_id,
                            "status": "failed",
                            "error": str(e),
                        },
                    ))
                except Exception as cb_error:
                    print(f"[RUN {run_id}] Failed to send error callback: {cb_error}", flush=True)

    # Start background thread
    import threading
    thread = threading.Thread(target=background_run, daemon=True)
    thread.start()
    
    # Return immediately with accepted status
    return jsonify({
        "status": "accepted",
        "run_id": run_id,
        "message": "Agent run started in background. Results will be sent to callback URL.",
        "agent_count": int(payload["total_personas"]),
    }), 202  # HTTP 202 Accepted


@app.get("/progress")
def progress_endpoint():
    return jsonify(_format_progress()), 200


@app.get("/health")
def health_endpoint():
    return jsonify({"status": "ok"}), 200


if __name__ == "__main__":
    # Minimal dev server
    app.run(host="0.0.0.0", port=8000, debug=True, use_reloader=False, threaded=True)
