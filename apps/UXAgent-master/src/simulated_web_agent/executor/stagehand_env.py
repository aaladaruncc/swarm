"""
Stagehand-based browser environment adapter.

This provides a WebAgentEnv-compatible interface using Stagehand for browser automation.
Stagehand handles natural language actions, self-healing selectors, and Browserbase integration.
"""

import asyncio
import base64
import json
import logging
import os
import time
from typing import Any, Callable, Optional

from pydantic import BaseModel, Field

logger = logging.getLogger(__name__)


class PageObservation(BaseModel):
    """Structured observation from the page"""
    url: str = Field(description="Current page URL")
    title: str = Field(description="Page title")
    visible_text: str = Field(description="Main visible text content")


class StagehandEnv:
    """
    Stagehand-based browser environment that provides a WebAgentEnv-compatible interface.
    
    Uses Stagehand's natural language actions (act, observe, extract) instead of
    explicit Playwright commands, making automations more resilient.
    """
    supports_screenshot: bool = False
    supports_stagehand_nl: bool = True
    
    def __init__(
        self,
        environment_config: Any = None,
        before_action_hook: Callable[[], None] = None,
        after_action_hook: Callable[[], None] = None,
        wait_hook: Callable[[], None] = None,
        browser_mode: str | None = None,
    ):
        self.config = environment_config
        self.before_action_hook = before_action_hook
        self.after_action_hook = after_action_hook
        self.wait_hook = wait_hook
        self.browser_mode = browser_mode or os.environ.get("BROWSER_MODE", "browserbase")
        
        self.stagehand = None
        self.page = None
        self.session_id = None
        self._step_count = 0
        self._last_url = None
        self._last_observation = None
        self._last_observation_step = -1
        self._last_observation_time = 0.0
        
    async def setup(
        self,
        task_config: dict | None = None,
        headless: Optional[bool] = None,
    ):
        """
        Initialize the Stagehand browser environment.
        
        Args:
            task_config: Configuration with start_url
            headless: Whether to run headless (only for local mode)
        """
        # Import here to avoid circular imports and allow optional dependency
        from stagehand import Stagehand
        
        # Determine server mode
        server = "remote" if self.browser_mode == "browserbase" else "local"
        
        # Get API keys
        browserbase_api_key = os.environ.get("BROWSERBASE_API_KEY")
        browserbase_project_id = os.environ.get("BROWSERBASE_PROJECT_ID")
        model_api_key = (
            os.environ.get("MODEL_API_KEY") or
            os.environ.get("GEMINI_API_KEY") or
            os.environ.get("OPENAI_API_KEY") or
            os.environ.get("ANTHROPIC_API_KEY")
        )
        
        # Get model name from environment or use default
        model_name = os.environ.get("STAGEHAND_MODEL_NAME", "google/gemini-2.0-flash")
        
        logger.info(f"Initializing Stagehand... (server={server}, model={model_name})")
        
        # Create Stagehand instance using SDK v3.4.6 API
        self.stagehand = Stagehand(
            browserbase_api_key=browserbase_api_key,
            browserbase_project_id=browserbase_project_id,
            model_api_key=model_api_key,
            server=server,
            local_headless=headless if headless is not None else True,
        )
        
        # Create a session with the model name (required in v3.4.6)
        self.session = self.stagehand.sessions.create(model_name=model_name)
        self.session_id = self.session.id
        # In v3.4.6, the session itself has act/observe/navigate methods (no separate page object)
        self.page = self.session  # Use session as the "page" for compatibility
        
        if server == "remote":
            logger.info(f"🌐 Browserbase session: https://www.browserbase.com/sessions/{self.session_id}")
        
        # Navigate to start URL if provided
        if task_config and task_config.get("start_url"):
            start_url = task_config["start_url"]
            logger.info(f"Navigating to: {start_url}")
            self.session.navigate(url=start_url)
            self._last_url = start_url
            await asyncio.sleep(1)  # Wait for page to load
        
        logger.info("✅ Stagehand environment ready")
        return self
    
    async def observation(self) -> dict:
        """
        Get the current observation of the page.
        
        Returns:
            Dictionary with page state information compatible with the agent
        """
        if not self.session:
            return {
                "error": "Session not initialized",
                "clickable_elements": [],
                "html": "",
                "tabs": [],
            }

        cache_window = float(os.getenv("STAGEHAND_OBSERVE_CACHE_SECONDS", "2"))
        if (
            self._last_observation
            and self._last_observation_step == self._step_count
            and (time.time() - self._last_observation_time) <= cache_window
        ):
            return self._last_observation

        if os.getenv("STAGEHAND_SKIP_OBSERVE", "").lower() in ("1", "true", "yes"):
            current_url = self._get_current_url()
            if os.getenv("STAGEHAND_USE_EXTRACT", "true").lower() in ("1", "true", "yes"):
                extracted = await self._extract_page_snapshot(current_url)
                if extracted:
                    self._last_observation = extracted
                    self._last_observation_step = self._step_count
                    self._last_observation_time = time.time()
                    return extracted
            fallback_html = f"""
<html>
<head><title>Page</title></head>
<body>
  <p>URL: {current_url}</p>
  <p>Observation skipped (STAGEHAND_SKIP_OBSERVE=true).</p>
</body>
</html>
"""
            obs = {
                "url": current_url,
                "clickable_elements": [],
                "html": fallback_html,
                "tabs": [{"url": current_url, "title": ""}],
            }
            self._last_observation = obs
            self._last_observation_step = self._step_count
            self._last_observation_time = time.time()
            return obs
        
        try:
            # Get page elements using Stagehand's observe (synchronous in v3.4.6)
            instruction = (
                "List interactive elements (buttons, links, inputs, form fields) with text/description."
            )
            timeout_s = float(os.getenv("STAGEHAND_OBSERVE_TIMEOUT_SECONDS", "20"))
            observed_response = await asyncio.wait_for(
                asyncio.to_thread(
                    lambda: self.session.observe(instruction=instruction)
                ),
                timeout=timeout_s,
            )
            
            # Convert SessionObserveResponse to dict for processing
            observed_data = observed_response.model_dump() if hasattr(observed_response, 'model_dump') else {}
            
            # Extract URL from session data if available
            current_url = self._get_current_url()
            
            # Extract clickable elements from Stagehand's observe response
            # SessionObserveResponse structure: { success: bool, data: { result: [DataResult] } }
            clickable_elements = []
            html_parts = []
            
            # Parse the actual Stagehand response structure
            elements = []
            if isinstance(observed_data, dict):
                if observed_data.get('success') and 'data' in observed_data:
                    data = observed_data['data']
                    if isinstance(data, dict):
                        # The actual structure is data.result (list of DataResult)
                        result = data.get('result', [])
                        if isinstance(result, list):
                            elements = result
                        logger.debug(f"Parsed {len(elements)} elements from observe response")
                    elif isinstance(data, list):
                        elements = data
                        
            # Log for debugging if no elements found
            if not elements:
                logger.debug(f"No elements found in observe response: {observed_data}")
            
            # Convert Stagehand elements to clickable_elements format
            for i, elem in enumerate(elements if isinstance(elements, list) else []):
                if isinstance(elem, dict):
                    # Create a semantic ID from the element
                    selector = elem.get('selector', '')
                    description = elem.get('description', '')
                    text = elem.get('text', '')
                    method = elem.get('method', 'click')
                    
                    # Generate a semantic ID
                    semantic_id = f"element_{i}"
                    if description:
                        # Clean description for use as ID
                        semantic_id = description.lower().replace(' ', '_')[:50]
                    
                    clickable_elements.append({
                        "semantic_id": semantic_id,
                        "selector": selector,
                        "description": description,
                        "text": text,
                        "method": method,
                    })
                    
                    # Add to HTML representation
                    html_parts.append(f'<div parser-semantic-id="{semantic_id}">{description or text}</div>')
            
            # Generate simplified HTML representation for the agent
            html_content = f"""
<html>
<head><title>Page</title></head>
<body>
<div id="page-content">
  <p>URL: {current_url}</p>
  <div id="interactive-elements">
    {"".join(html_parts) if html_parts else "<p>No interactive elements found</p>"}
  </div>
</div>
</body>
</html>
"""
            
            obs = {
                "url": current_url,
                "title": "",
                "html": html_content,
                "clickable_elements": clickable_elements,
                "observed_elements": observed_data,  # Keep original for debugging
                "screenshot": "",
                "tabs": [{"url": current_url, "title": ""}],
            }
            self._last_observation = obs
            self._last_observation_step = self._step_count
            self._last_observation_time = time.time()
            return obs
        except Exception as e:
            logger.error(f"Error getting observation: {e}")
            # Best-effort fallback so the agent can keep going.
            current_url = self._get_current_url()
            fallback_html = f"""
<html>
<head><title>Page</title></head>
<body>
  <p>URL: {current_url}</p>
  <p>No interactive elements captured (observe failed).</p>
</body>
</html>
"""
            obs = {
                "error": str(e),
                "url": current_url,
                "clickable_elements": [],
                "html": fallback_html,
                "tabs": [{"url": current_url, "title": ""}],
            }
            self._last_observation = obs
            self._last_observation_step = self._step_count
            self._last_observation_time = time.time()
            return obs
    
    async def step(
        self,
        action: str,
        before_hook: Callable[[], None] = None,
        after_hook: Callable[[], None] = None,
    ) -> dict:
        """
        Execute an action using Stagehand's natural language capabilities.
        
        Args:
            action: JSON string or natural language action description
            
        Returns:
            Observation dictionary with page state and action result
        """
        self._step_count += 1
        
        # Run before hooks
        if self.before_action_hook:
            if asyncio.iscoroutinefunction(self.before_action_hook):
                await self.before_action_hook()
            else:
                self.before_action_hook()
        
        if before_hook:
            if asyncio.iscoroutinefunction(before_hook):
                await before_hook()
            else:
                before_hook()
        
        try:
            # Parse action - can be JSON or natural language
            action_desc, action_data = self._parse_action_with_data(action)
            
            logger.info(f"[Step {self._step_count}] Executing: {action_desc}")
            
            # Handle UX-specific actions locally (not supported by Stagehand)
            action_type = action_data.get("action", "") if action_data else ""
            if action_type == "goto_url":
                self._last_url = action_data.get("url")
            
            if action_type == "read":
                # Simulate reading/dwell time
                duration_ms = action_data.get("duration_ms", 3000)
                await asyncio.sleep(duration_ms / 1000)
                result = f"Read for {duration_ms}ms"
            elif action_type == "wait":
                # Simulate waiting
                duration_ms = action_data.get("duration_ms", 2000)
                await asyncio.sleep(duration_ms / 1000)
                result = f"Waited for {duration_ms}ms"
            elif action_type in ("terminate", "done", "end"):
                # End the session
                obs = await self.observation()
                obs["action_result"] = "Task terminated"
                obs["step"] = self._step_count
                obs["terminated"] = True
                return obs
            else:
                # Execute the action using Stagehand (synchronous in v3.4.6)
                result = self.session.act(input=action_desc)
            
            logger.info(f"[Step {self._step_count}] Action completed: {result}")
            
            # Wait for page to settle
            await asyncio.sleep(0.5)
            
            # Get new observation
            obs = await self.observation()
            obs["action_result"] = str(result)
            obs["step"] = self._step_count
            obs["terminated"] = False
            
        except Exception as e:
            logger.error(f"Error executing action: {e}")
            obs = await self.observation()
            obs["error"] = str(e)
            obs["terminated"] = True
        
        # Run after hooks
        if after_hook:
            if asyncio.iscoroutinefunction(after_hook):
                await after_hook()
            else:
                after_hook()
        
        if self.after_action_hook:
            if asyncio.iscoroutinefunction(self.after_action_hook):
                await self.after_action_hook()
            else:
                self.after_action_hook()
        
        return obs
    
    def _parse_action(self, action: str) -> str:
        """
        Parse action from JSON format to natural language description.
        
        Converts structured actions like:
            {"action": "click", "target": "login_button"}
        To natural language like:
            "click on the login button"
        """
        try:
            # Try parsing as JSON
            if action.strip().startswith('{') or action.strip().startswith('['):
                data = json.loads(action)
                
                # Handle array of actions
                if isinstance(data, list):
                    data = data[0] if data else {}
                
                action_type = data.get("type") or data.get("action", "")
                target = data.get("target") or data.get("semantic_id", "")
                value = data.get("value") or data.get("text", "")
                
                # Convert to natural language
                if action_type == "click":
                    return f"click on the element {target}"
                elif action_type == "type":
                    return f"type '{value}' into the {target} field"
                elif action_type == "scroll":
                    direction = data.get("direction", "down")
                    amount = data.get("amount", 300)
                    return f"scroll {direction} by {amount} pixels"
                elif action_type == "navigate" or action_type == "goto":
                    url = data.get("url", target)
                    return f"navigate to {url}"
                elif action_type == "back":
                    return "go back to the previous page"
                elif action_type == "hover":
                    return f"hover over the element {target}"
                elif action_type == "select":
                    return f"select '{value}' from the {target} dropdown"
                elif action_type == "wait":
                    return f"wait for {data.get('seconds', 1)} seconds"
                elif action_type == "done" or action_type == "end":
                    return "the task is complete"
                else:
                    # Return as-is for unknown actions
                    return f"{action_type} {target} {value}".strip()
            else:
                # Already natural language
                return action
        except json.JSONDecodeError:
            # Not JSON, return as-is (already natural language)
            return action
    
    def _parse_action_with_data(self, action: str) -> tuple[str, dict]:
        """
        Parse action from JSON format and return both natural language description
        and the original parsed data.
        
        Returns:
            Tuple of (action_description, action_data_dict)
        """
        try:
            # Try parsing as JSON
            if action.strip().startswith('{') or action.strip().startswith('['):
                data = json.loads(action)
                
                # Handle array of actions
                if isinstance(data, list):
                    data = data[0] if data else {}
                
                action_type = data.get("type") or data.get("action", "")
                target = data.get("target") or data.get("semantic_id", "")
                value = data.get("value") or data.get("text", "")
                
                # Convert to natural language
                if action_type == "click":
                    desc = f"click on the element {target}"
                elif action_type == "type":
                    enter = bool(data.get("enter"))
                    if enter:
                        desc = f"type '{value}' into the {target} field and press Enter"
                    else:
                        desc = f"type '{value}' into the {target} field"
                elif action_type == "scroll":
                    direction = data.get("direction", "down")
                    amount = data.get("amount", 300)
                    desc = f"scroll {direction} by {amount} pixels"
                elif action_type in ("navigate", "goto", "goto_url"):
                    url = data.get("url", target)
                    desc = f"navigate to {url}"
                elif action_type == "back":
                    desc = "go back to the previous page"
                elif action_type == "refresh":
                    desc = "refresh the page"
                elif action_type == "key_press":
                    key = data.get("key", "Enter")
                    desc = f"press {key}"
                elif action_type == "hover":
                    desc = f"hover over the element {target}"
                elif action_type == "select":
                    desc = f"select '{value}' from the {target} dropdown"
                elif action_type == "read":
                    desc = "read"  # Handled locally
                elif action_type == "wait":
                    desc = "wait"  # Handled locally
                elif action_type in ("terminate", "done", "end"):
                    desc = "terminate"  # Handled locally
                else:
                    # Return as-is for unknown actions
                    desc = f"{action_type} {target} {value}".strip()
                
                return (desc, data)
            else:
                # Already natural language
                return (action, {})
        except json.JSONDecodeError:
            # Not JSON, return as-is (already natural language)
            return (action, {})
    
    async def screenshot(self) -> str:
        """Capture screenshot - not directly supported in v3.4.6 API"""
        # Screenshots are not directly available in the Stagehand v3.4.6 API
        # The browser automation happens on the remote server
        return ""
    
    async def extract(self, instruction: str, schema: Any = None) -> Any:
        """
        Extract structured data from the page using Stagehand.
        
        Args:
            instruction: What to extract
            schema: Pydantic model for structured extraction
            
        Returns:
            Extracted data
        """
        # Stagehand v3.4.6 API uses synchronous extract with instruction kwarg
        return self.session.extract(instruction=instruction)
    
    async def close(self):
        """Close the browser environment and cleanup"""
        logger.info("Closing Stagehand environment...")
        if self.session:
            try:
                self.session.end()
            except Exception as e:
                logger.warning(f"Error ending session: {e}")
        if self.stagehand:
            try:
                self.stagehand.close()
            except Exception as e:
                logger.warning(f"Error closing Stagehand: {e}")
        self.stagehand = None
        self.session = None
        self.page = None
        logger.info("✅ Stagehand environment closed")
    
    def debug_pause(self):
        """Pause for debugging (noop in Stagehand mode)"""
        pass
    
    # Compatibility methods for WebAgentEnv interface
    
    async def reset(self):
        """Reset the environment"""
        if self.session:
            self.session.navigate(url="about:blank")
        self._step_count = 0
    
    async def navigate(self, url: str):
        """Navigate to a URL"""
        self.session.navigate(url=url)
        self._last_url = url
        await asyncio.sleep(0.5)
    
    async def click(self, target: str):
        """Click on an element"""
        self.session.act(input=f"click on {target}")
    
    async def type_text(self, target: str, text: str):
        """Type text into an element"""
        self.session.act(input=f"type '{text}' into {target}")
    
    async def scroll(self, direction: str = "down", amount: int = 300):
        """Scroll the page"""
        self.session.act(input=f"scroll {direction} by {amount} pixels")

    def _get_current_url(self) -> str:
        session_data = getattr(self.session, "data", None)
        if session_data and hasattr(session_data, "url") and session_data.url:
            return session_data.url
        return self._last_url or "unknown"

    async def _extract_page_snapshot(self, current_url: str) -> Optional[dict]:
        try:
            instruction = (
                "Return JSON with fields: url, title, summary, interactive_elements "
                "(list of {description,text,role,type}). Keep it concise."
            )
            extracted = await asyncio.to_thread(
                lambda: self.session.extract(instruction=instruction)
            )
            data = extracted
            if hasattr(extracted, "model_dump"):
                data = extracted.model_dump()
            if isinstance(data, dict) and "data" in data:
                data = data.get("data", {})
            if isinstance(data, str):
                try:
                    data = json.loads(data)
                except json.JSONDecodeError:
                    data = {"summary": data}
            if not isinstance(data, dict):
                return None

            elements = data.get("interactive_elements") or []
            clickable_elements = []
            html_parts = []
            for i, elem in enumerate(elements if isinstance(elements, list) else []):
                if not isinstance(elem, dict):
                    continue
                description = elem.get("description") or elem.get("text") or f"element_{i}"
                semantic_id = description.lower().replace(" ", "_")[:50]
                clickable_elements.append(
                    {
                        "semantic_id": semantic_id,
                        "description": description,
                        "text": elem.get("text", ""),
                        "method": elem.get("role", "click"),
                    }
                )
                html_parts.append(
                    f'<div parser-semantic-id="{semantic_id}">{description}</div>'
                )

            html_content = f"""
<html>
<head><title>{data.get('title', 'Page')}</title></head>
<body>
  <p>URL: {data.get('url', current_url)}</p>
  <p>Summary: {data.get('summary', '')}</p>
  <div id="interactive-elements">
    {"".join(html_parts) if html_parts else "<p>No interactive elements found</p>"}
  </div>
</body>
</html>
"""
            return {
                "url": data.get("url", current_url),
                "title": data.get("title", ""),
                "html": html_content,
                "clickable_elements": clickable_elements,
                "observed_elements": data,
                "screenshot": "",
                "tabs": [{"url": data.get("url", current_url), "title": ""}],
            }
        except Exception as e:
            logger.warning(f"Extract fallback failed: {e}")
            return None
