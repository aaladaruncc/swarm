import asyncio
import json
import logging
import os
from typing import Any, Callable, Dict, List, Optional

import yaml

from .experiment import experiment_async
from .persona import generate_personas
from .survey import run_survey

log = logging.getLogger("simulated_web_agent.main.run")



def load_config(config_file: str) -> Dict[str, Any]:
    with open(config_file, "r") as f:
        return yaml.safe_load(f)


def _safe_ping(cb: Optional[Callable[[dict], None]], evt: dict):
    if not cb:
        return
    try:
        cb(evt)
    except Exception:
        # never let UI progress kill the job
        pass


async def run_async(
    total_personas: int,
    demographics: list[Dict[str, Any]],
    general_intent: str,
    start_url: str,
    max_steps: int,
    questionnaire: dict,
    headless: bool = False,
    concurrency: int = 4,
    example_persona: str = None,
    on_progress: Optional[Callable[[dict], None]] = None,
) -> Dict[str, Any]:
    """
    Run the full UX testing pipeline and return all collected data.
    
    Returns:
        Dict with:
        - personas: List of generated personas
        - agent_results: List of individual agent run results
        - survey_results: Survey responses (if questionnaire provided)
        - success: bool
    """
    ping = lambda e: _safe_ping(on_progress, e)
    
    result = {
        "personas": [],
        "agent_results": [],
        "survey_results": [],
        "success": False,
        "error": None,
    }
    
    try:
        # ---------------- 1) Personas ----------------
        ping({"phase": "personas", "status": "start", "total": total_personas})
        all_personas_intents = await generate_personas(
            demographics=demographics,
            general_intent=general_intent,
            n=total_personas,
            on_progress=lambda k, n: ping(
                {"phase": "personas", "status": "progress", "current": k, "total": n}
            ),
            example_text=example_persona,
        )
        ping({
            "phase": "personas",
            "status": "progress",
            "current": total_personas,
            "total": total_personas,
        })
        
        result["personas"] = all_personas_intents
        
        # Save locally for backwards compatibility
        with open("personas.json", "w", encoding="utf-8") as f:
            json.dump(all_personas_intents, f, indent=2, ensure_ascii=False)

        # ---------------- 2) Run agents ----------------
        total_agents = len(all_personas_intents)
        ping({"phase": "agents", "status": "start", "total": total_agents})

        agent_results = await experiment_async(
            agents=all_personas_intents,
            start_url=start_url,
            max_steps=max_steps,
            config_name="base",
            config_path=".",
            concurrency=concurrency,
            headless=headless,
            on_progress=lambda k, n: ping(
                {"phase": "agents", "status": "progress", "current": k, "total": n}
            ),
        )
        ping({
            "phase": "agents",
            "status": "progress",
            "current": total_agents,
            "total": total_agents,
        })
        
        result["agent_results"] = agent_results

        # ---------------- 3) Surveys ----------------
        if questionnaire:
            ping({"phase": "surveys", "status": "start", "total": total_agents})
            
            # Get trace dirs from agent results for survey
            trace_dirs = []
            for ar in agent_results:
                if ar.get("run_id") and not ar.get("error"):
                    from pathlib import Path
                    trace_dirs.append(Path("runs") / ar["run_id"])
            
            if trace_dirs:
                survey_results = await run_survey(
                    trace_dirs=trace_dirs,
                    questionnaire=questionnaire,
                    on_progress=lambda k, n: ping(
                        {"phase": "surveys", "status": "progress", "current": k, "total": n}
                    ),
                )
                result["survey_results"] = survey_results
            
            ping({
                "phase": "surveys",
                "status": "progress",
                "current": total_agents,
                "total": total_agents,
            })

        ping({"phase": "all", "status": "done"})
        result["success"] = True
        
    except Exception as e:
        log.exception("Pipeline failed")
        result["error"] = str(e)
        result["success"] = False
    
    return result


def run(*args, **kwargs) -> Dict[str, Any]:
    """Synchronous wrapper for run_async."""
    return asyncio.run(run_async(*args, **kwargs))


if __name__ == "__main__":
    cfg = load_config("conf/runConfig.yaml")
    result = asyncio.run(
        run_async(
            total_personas=cfg.get("total_personas", 8),
            demographics=cfg["demographics"],
            general_intent=cfg["general_intent"],
            start_url=cfg["start_url"],
            max_steps=cfg["max_steps"],
            questionnaire=cfg["questionnaire"],
            example_persona=cfg.get("example_persona"),
            concurrency=cfg["concurrency"],
            headless=True,
        )
    )
    print(f"Pipeline completed. Success: {result['success']}")
    print(f"Agent results: {len(result['agent_results'])}")
