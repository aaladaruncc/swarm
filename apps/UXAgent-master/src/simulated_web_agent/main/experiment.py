import asyncio
import base64
import json
import logging
import pathlib
import shutil
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

log = logging.getLogger("simulated_web_agent.main.experiment")
logging.basicConfig(level=logging.INFO)


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
    }

    async def before_action_hook():
        nonlocal steps_taken
        if cfg.environment.recording.enabled:
            return
        
        # Capture screenshots as base64
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

        while steps_taken < max_steps:
            # Collect observation
            collected_data["observations"].append({
                "step": steps_taken,
                "html_length": len(obs.get("html", "")),
                "url": obs.get("tabs", [{}])[0].get("url") if obs.get("tabs") else None,
            })
            
            # Save to disk (backwards compatibility)
            with open(trace_dir / "observation_trace.jsonl", "a") as f:
                json.dump(obs, f)
            with open(trace_dir / "simp_html" / f"simp_html_{steps_taken}.html", "w") as f:
                f.write(obs["html"])
            with open(trace_dir / "raw_html" / f"raw_html_{steps_taken}.html", "w") as f:
                f.write(await env.page.content())

            # Get action from policy
            action = await policy.forward(env)
            collected_data["actions"].append(action)
            
            # Save action trace
            with open(trace_dir / "action_trace.json", "w") as f:
                json.dump(collected_data["actions"], f, indent=2)
            
            # Save observation text
            with open(trace_dir / "observation_trace" / f"observation_trace_{steps_taken}.txt", "w") as f:
                f.write(policy.agent.observation)
            
            # Collect memory trace
            collected_data["memories"] = policy.agent.memory.memories.copy()
            with open(trace_dir / "memory_trace.json", "w") as f:
                json.dump(collected_data["memories"], f)

            log.info(f"Taking action {action}")
            log.info(f"Action: {steps_taken + 1} out of {max_steps}")
            
            obs = await env.step(action)
            steps_taken += 1

            if obs.get("terminated"):
                collected_data["terminated"] = True
                collected_data["score"] = obs.get("score")
                break

        collected_data["steps_taken"] = steps_taken
        
        log.info(
            f"Finished persona run: terminated={collected_data['terminated']}, "
            f"score={collected_data['score']}, steps={steps_taken}"
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
