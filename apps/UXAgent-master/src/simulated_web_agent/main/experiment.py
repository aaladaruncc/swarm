import asyncio
import base64
import json
import logging
import os
import pathlib
import shutil
import time
import traceback
import uuid
from datetime import datetime
from typing import Any, Callable, Dict, List, Optional

from dotenv import load_dotenv
from hydra import compose, initialize_config_dir
from omegaconf import DictConfig

from ..agent import context, gpt
from ..executor.env import WebAgentEnv  # Playwright env
from .model import AgentPolicy  # noqa

# Try to import StagehandEnv (optional)
try:
    from ..executor.stagehand_env import StagehandEnv
    STAGEHAND_AVAILABLE = True
except ImportError:
    STAGEHAND_AVAILABLE = False
    StagehandEnv = None

log = logging.getLogger("simulated_web_agent.main.experiment")



async def _run_for_persona_and_intent(
    cfg: DictConfig,
    persona_info: Dict,
    start_url: str,
    max_steps: int,
    wait_for_login: bool = False,
    env_setup_hook: Callable = None,
    env_wait_hook: Callable = None,
) -> Dict[str, Any]:
    """Run a single agent and return all collected data."""
    persona = persona_info["persona"]
    intent = persona_info["intent"]
    log.info(
        f"\n=== persona (first 200 chars) ===\n{persona[:200]}...\n=== intent ===\n{intent}"
    )
    run_uid = uuid.uuid4().hex[:8]
    run_id = f"{datetime.now().strftime('%Y-%m-%d_%H-%M-%S')}_{uuid.uuid4().hex[:4]}"

    task_to_use = {
        "sites": ["shopping"],
        "task_id": 1,
        "require_login": False,
        "start_url": start_url,
        "intent": intent or "Interactive testing session",
    }

    # Create local dirs for backwards compatibility (optional file saving)
    base_dir = pathlib.Path().resolve()
    trace_dir = base_dir / "runs" / run_id
    for subdir in ["simp_html", "raw_html", "api_trace", "screenshot", "observation_trace"]:
        (trace_dir / subdir).mkdir(parents=True, exist_ok=True)
    
    # Save persona and intent locally
    (trace_dir / "basic_info.json").write_text(json.dumps(persona_info))
    context.run_path.set(trace_dir)
    
    # ============ Data collectors (in-memory) ============
    steps_taken = 0
    session_start_time = time.time()
    first_action_time = None
    last_action_time = session_start_time
    page_times = []  # Track time spent on each page
    current_page_url = start_url
    current_page_start = session_start_time
    hesitation_threshold_ms = 5000  # 5 seconds = hesitation
    hesitations = []
    backtrack_count = 0
    last_url = None
    
    collected_data = {
        "run_id": run_id,
        "persona": persona,
        "intent": intent,
        "persona_info": persona_info,
        "start_url": start_url,
        "actions": [],
        "memories": [],
        "observations": [],
        "screenshots": [],  # Each: {"step": int, "base64": str, "full_page_base64": str}
        "terminated": False,
        "score": None,
        "steps_taken": 0,
        "error": None,
        # Timing metrics for UX analysis
        "timing_metrics": {
            "session_start_time": session_start_time,
            "time_to_first_action_ms": 0,
            "total_duration_ms": 0,
            "time_per_page": [],
            "hesitation_moments": [],
            "backtrack_count": 0,
            "average_action_interval_ms": 0,
        }
    }

    async def before_action_hook():
        nonlocal steps_taken, use_stagehand
        if cfg.environment.recording.enabled:
            return
        
        # Skip screenshot capture for Stagehand - the Session API doesn't support screenshots
        # Screenshots for Stagehand sessions are available via Browserbase dashboard
        if use_stagehand:
            return
        
        # Capture screenshots as base64 (Playwright only)
        try:
            screenshot_bytes = await env.page.screenshot()
            full_page_bytes = await env.page.screenshot(full_page=True)
            
            collected_data["screenshots"].append({
                "step": steps_taken,
                "base64": base64.b64encode(screenshot_bytes).decode("utf-8"),
                "full_page_base64": base64.b64encode(full_page_bytes).decode("utf-8"),
            })
            
            # Also save to disk for backwards compatibility
            await env.page.screenshot(
                path=trace_dir / "screenshot" / f"screenshot_{steps_taken}_full_page.png",
                full_page=True,
            )
            await env.page.screenshot(
                path=trace_dir / "screenshot" / f"screenshot_{steps_taken}.png",
            )
        except Exception as e:
            log.warning(f"Failed to capture screenshot at step {steps_taken}: {e}")

    # Select environment based on USE_STAGEHAND env var
    use_stagehand = os.environ.get("USE_STAGEHAND", "").lower() in ("true", "1", "yes")
    
    if use_stagehand and STAGEHAND_AVAILABLE:
        log.info(f"[{run_uid}] Using StagehandEnv (Stagehand mode)")
        env = StagehandEnv(
            cfg.environment, before_action_hook=before_action_hook, wait_hook=env_wait_hook
        )
    else:
        if use_stagehand and not STAGEHAND_AVAILABLE:
            log.warning("USE_STAGEHAND=true but stagehand not installed, falling back to WebAgentEnv")
        log.info(f"[{run_uid}] Using WebAgentEnv (Playwright mode)")
        env = WebAgentEnv(
            cfg.environment, before_action_hook=before_action_hook, wait_hook=env_wait_hook
        )

    log.info(f"[{run_uid}] env created")
    try:
        policy = AgentPolicy(persona, intent)
        log.info(f"Setting up env with headless = {cfg.environment.browser.launch_options.headless}")
        await env.setup(task_to_use, headless=cfg.environment.browser.launch_options.headless)

        if wait_for_login:
            env.debug_pause()

        if env_setup_hook:
            await env_setup_hook(env)
        obs = await env.observation()

        log.info("Initial observation ready")
        
        # Session timeout: configurable to avoid Browserbase cutoff
        SESSION_TIMEOUT_SECONDS = int(os.getenv("SESSION_TIMEOUT_SECONDS", "1200"))

        while steps_taken < max_steps:
            # Check session timeout
            elapsed = time.time() - session_start_time
            if elapsed > SESSION_TIMEOUT_SECONDS:
                log.warning(f"Session timeout after {elapsed:.1f}s, terminating gracefully")
                collected_data["terminated"] = True
                collected_data["error"] = f"Session timeout after {elapsed:.1f}s"
                break
            
            # Collect observation
            collected_data["observations"].append({
                "step": steps_taken,
                "html_length": len(obs.get("html", "")),
                "url": obs.get("tabs", [{}])[0].get("url") if obs.get("tabs") else None,
            })
            
            # Save to disk (backwards compatibility)
            with open(trace_dir / "observation_trace.jsonl", "a") as f:
                json.dump(obs, f)
            
            # Save simplified HTML (from observation)
            simp_html = obs.get("html", "")
            if simp_html:
                with open(trace_dir / "simp_html" / f"simp_html_{steps_taken}.html", "w") as f:
                    f.write(simp_html)
            
            # Save raw HTML (Playwright only - Stagehand Session doesn't have content())
            if not use_stagehand and hasattr(env, 'page') and hasattr(env.page, 'content'):
                try:
                    raw_html = await env.page.content()
                    with open(trace_dir / "raw_html" / f"raw_html_{steps_taken}.html", "w") as f:
                        f.write(raw_html)
                except Exception as e:
                    log.warning(f"Failed to get raw HTML at step {steps_taken}: {e}")

            # Get action from policy
            action = await policy.forward(env)
            collected_data["actions"].append(action)
            
            # Save action trace
            with open(trace_dir / "action_trace.json", "w") as f:
                json.dump(collected_data["actions"], f, indent=2)
            
            # Save observation text
            with open(trace_dir / "observation_trace" / f"observation_trace_{steps_taken}.txt", "w") as f:
                obs_data = policy.agent.observation
                if isinstance(obs_data, dict):
                    f.write(json.dumps(obs_data, indent=2))
                else:
                    f.write(str(obs_data))
            
            # Collect memory trace
            collected_data["memories"] = policy.agent.memory.memories.copy()
            with open(trace_dir / "memory_trace.json", "w") as f:
                json.dump(collected_data["memories"], f)

            log.info(f"Taking action {action}")
            log.info(f"Action: {steps_taken + 1} out of {max_steps}")
            
            # Track timing before action
            action_start = time.time()
            
            obs = await env.step(action)
            
            # Track timing after action
            action_end = time.time()
            action_duration_ms = int((action_end - action_start) * 1000)
            
            # Track first action time
            if first_action_time is None:
                first_action_time = action_end
                collected_data["timing_metrics"]["time_to_first_action_ms"] = int(
                    (first_action_time - session_start_time) * 1000
                )
            
            # Track time between actions (hesitation detection)
            time_since_last = int((action_start - last_action_time) * 1000)
            if time_since_last > hesitation_threshold_ms and steps_taken > 0:
                hesitations.append({
                    "step": steps_taken,
                    "duration_ms": time_since_last,
                    "before_action": action[:100] if isinstance(action, str) else str(action)[:100]
                })
            last_action_time = action_end
            
            # Track page navigation and time per page
            current_url = obs.get("tabs", [{}])[0].get("url") if obs.get("tabs") else None
            if current_url and current_url != current_page_url:
                # Finished with previous page
                page_duration_ms = int((action_end - current_page_start) * 1000)
                page_times.append({
                    "url": current_page_url,
                    "duration_ms": page_duration_ms,
                    "step_range": f"{current_page_start}-{steps_taken}"
                })
                
                # Check for backtracking (returning to previous URL)
                if last_url and current_url == last_url:
                    backtrack_count += 1
                
                last_url = current_page_url
                current_page_url = current_url
                current_page_start = action_end
            
            steps_taken += 1

            if obs.get("terminated"):
                collected_data["terminated"] = True
                collected_data["score"] = obs.get("score")
                break

        # Finalize timing metrics
        session_end_time = time.time()
        total_duration_ms = int((session_end_time - session_start_time) * 1000)
        
        # Add final page time
        if current_page_url:
            page_times.append({
                "url": current_page_url,
                "duration_ms": int((session_end_time - current_page_start) * 1000),
                "step_range": f"{int(current_page_start)}-end"
            })
        
        collected_data["timing_metrics"].update({
            "total_duration_ms": total_duration_ms,
            "time_per_page": page_times,
            "hesitation_moments": hesitations,
            "backtrack_count": backtrack_count,
            "average_action_interval_ms": total_duration_ms // max(steps_taken, 1),
        })
        
        collected_data["steps_taken"] = steps_taken
        
        log.info(
            f"Finished persona run: terminated={collected_data['terminated']}, "
            f"score={collected_data['score']}, steps={steps_taken}, "
            f"duration={total_duration_ms}ms, hesitations={len(hesitations)}, "
            f"backtracks={backtrack_count}"
        )

        # Save final memory trace
        final_memories_str = policy.get_formatted_memories()
        trace_file = trace_dir / f"{run_id}.txt"
        trace_file.write_text(final_memories_str, encoding="utf-8")
        collected_data["final_memory_text"] = final_memories_str

        log.info(f"Saved memory trace to {trace_file}")

    except Exception as e:
        err = traceback.format_exc()
        log.error(err)
        collected_data["error"] = str(e)
        try:
            (trace_dir / "error.txt").write_text(err)
        except Exception:
            pass
    finally:
        try:
            # Cancel the slow loop task (reflect/wonder)
            await policy.close()
            log.info(f"[{run_uid}] policy.close() completed")
        except Exception as e:
            log.warning(f"[{run_uid}] policy.close() raised: {e!r}")
        try:
            log.info(f"[{run_uid}] closing env...")
            await asyncio.wait_for(asyncio.shield(env.close()), timeout=10)
            log.info(f"[{run_uid}] env.close() completed")
        except Exception as e:
            log.exception(f"[{run_uid}] env.close() raised: {e!r}")
    
    return collected_data


def _load_cfg(config_name: str = "base"):
    here = pathlib.Path(__file__).resolve().parent
    conf_dir = here.parents[2] / "conf"
    with initialize_config_dir(version_base=None, config_dir=str(conf_dir)):
        cfg = compose(config_name=config_name)
    return cfg


async def experiment_async(
    agents: List[Dict[str, str]],
    start_url: str,
    max_steps: int,
    *,
    headless=False,
    config_name: str = "base",
    config_path: str = ".",
    concurrency: int = 4,
    on_progress: Optional[Callable[[int, int], None]] = None,
) -> List[Dict[str, Any]]:
    """Run all agents and return collected data for each."""
    cfg = _load_cfg(config_name=config_name)
    if concurrency:
        cfg.environment.browser.user_data_dir = None
    gpt.provider = cfg.llm_provider
    log.info(f"LLM provider: {cfg.llm_provider}")

    sem = asyncio.Semaphore(concurrency)

    total = len(agents)
    done = 0
    lock = asyncio.Lock()

    async def run_one(entry: Dict[str, str]) -> Dict[str, Any]:
        nonlocal done
        async with sem:
            result = await _run_for_persona_and_intent(
                cfg=cfg,
                persona_info=entry,
                start_url=start_url,
                max_steps=max_steps,
            )

        # Progress tick
        async with lock:
            done += 1
            if on_progress:
                try:
                    on_progress(done, total)
                except Exception:
                    pass
        return result

    tasks = [asyncio.create_task(run_one(e)) for e in agents]
    results = await asyncio.gather(*tasks, return_exceptions=True)
    
    # Convert exceptions to error dicts
    processed_results = []
    for i, r in enumerate(results):
        if isinstance(r, Exception):
            log.exception("A session failed", exc_info=r)
            processed_results.append({
                "run_id": f"error_{i}",
                "persona": agents[i].get("persona", ""),
                "intent": agents[i].get("intent", ""),
                "error": str(r),
                "terminated": True,
            })
        else:
            processed_results.append(r)
    
    return processed_results
