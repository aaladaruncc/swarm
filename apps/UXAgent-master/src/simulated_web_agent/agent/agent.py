import asyncio
import inspect
import json
import logging
import os
import time
from typing import Optional, Union

from . import context, gpt
from .gpt import async_chat, load_prompt
from .memory import Action, Memory, MemoryPiece, Observation, Plan, Reflection, Thought

PERCEIVE_PROMPT = load_prompt("perceive")
REFLECT_PROMPT = load_prompt("reflect")
WONDER_PROMPT = load_prompt("wonder")
PLANNING_PROMPT = load_prompt("planning")
ACTION_PROMPT = load_prompt("action")
STAGEHAND_ACTION_PROMPT = load_prompt("stagehand_action")
FEEDBACK_PROMPT = load_prompt("feedback")
logger = logging.getLogger(__name__)


# context manager to log api calls
class LogApiCall:
    def __enter__(self):
        Agent.api_call_count += 1
        logger.info("API call count: %s", Agent.api_call_count)
        self.method_name = inspect.currentframe().f_back.f_code.co_name
        self.retrieve_result = []
        self.request = []
        self.response = []
        self.start_time = time.time()
        context.api_call_manager.set(self)

    def __exit__(self, exc_type, exc_value, traceback):
        context.api_call_manager.set(None)
        with open(
            context.run_path.get()
            / "api_trace"
            / f"api_trace_{Agent.api_call_count}.json",
            "w",
        ) as f:
            json.dump(
                {
                    "request": self.request,
                    "response": self.response,
                    "method_name": self.method_name,
                    "retrieve_result": self.retrieve_result,
                    "time": time.time() - self.start_time,
                },
                f,
            )
        logger.info(f"API Call time: {time.time() - self.start_time}")


class Agent:
    memory: Memory
    persona: str
    current_plan: Optional[Plan]
    last_reflect_index = 0
    api_call_count = 0
    observation: Optional[Observation] = None
    deny_list = ["Crime", "crime", "Security", "security"]

    def __init__(self, persona, intent):
        self.memory = Memory(self)
        self.persona = persona
        self.intent = intent
        self.current_plan = None

    @staticmethod
    def _read_float_env(key: str, default: float) -> float:
        try:
            return float(os.getenv(key, str(default)))
        except ValueError:
            return default

    @staticmethod
    def _read_int_env(key: str, default: int) -> int:
        try:
            return int(os.getenv(key, str(default)))
        except ValueError:
            return default

    def _maybe_human_action(self, env: dict, planned_action: dict, last_action: dict | str):
        import random
        import os

        enable = os.getenv("ENABLE_HUMAN_BEHAVIOR", "false").lower() in ("1", "true", "yes")
        if not enable:
            return planned_action

        action_name = planned_action.get("action")
        if action_name in ("terminate", "done", "end"):
            return planned_action

        if random.random() > self._read_float_env("HUMAN_ACTION_PROB", 0.35):
            return planned_action

        last_action_name = ""
        if isinstance(last_action, dict):
            last_action_name = last_action.get("action", "")

        read_prob = self._read_float_env("HUMAN_READ_PROB", 0.3)
        wait_prob = self._read_float_env("HUMAN_WAIT_PROB", 0.25)
        scroll_prob = self._read_float_env("HUMAN_SCROLL_PROB", 0.35)
        hover_prob = self._read_float_env("HUMAN_HOVER_PROB", 0.1)
        total = read_prob + wait_prob + scroll_prob + hover_prob
        if total <= 0:
            return planned_action

        pick = random.random() * total
        clickables = [e for e in env.get("clickable_elements", []) if e is not None]

        if pick < read_prob:
            duration = random.randint(
                self._read_int_env("HUMAN_MIN_READ_MS", 1500),
                self._read_int_env("HUMAN_MAX_READ_MS", 4500),
            )
            if last_action_name == "read":
                return planned_action
            return {
                "action": "read",
                "duration_ms": duration,
                "description": "Reading the content carefully...",
            }
        if pick < read_prob + wait_prob:
            duration = random.randint(
                self._read_int_env("HUMAN_MIN_WAIT_MS", 800),
                self._read_int_env("HUMAN_MAX_WAIT_MS", 2000),
            )
            if last_action_name == "wait":
                return planned_action
            return {
                "action": "wait",
                "duration_ms": duration,
                "description": "Waiting for the page to settle...",
            }
        if pick < read_prob + wait_prob + scroll_prob:
            amount = random.randint(
                self._read_int_env("HUMAN_MIN_SCROLL_PX", 200),
                self._read_int_env("HUMAN_MAX_SCROLL_PX", 600),
            )
            direction = "down" if random.random() < 0.8 else "up"
            if last_action_name == "scroll":
                return planned_action
            return {
                "action": "scroll",
                "direction": direction,
                "amount": amount,
                "description": "Scrolling to explore content...",
            }
        if hover_prob > 0 and clickables:
            target = clickables[0].get("semantic_id") or clickables[0].get("description", "")
            if last_action_name == "hover" or not target:
                return planned_action
            return {
                "action": "hover",
                "target": target,
                "description": "Hovering to see more detail...",
            }

        return planned_action

    async def perceive(self, environment):
        environment_full = json.dumps(environment)

        for denied_word in self.deny_list:
            environment_full = environment_full.replace(denied_word, "***")
        # print(environment_full)
        logger.info("agent perceiving environment...")
        with LogApiCall():
            request = [
                {"role": "system", "content": PERCEIVE_PROMPT},
                {"role": "user", "content": environment_full},
            ]
            result = await async_chat(request, json_mode=True, max_tokens=64000)
            result = json.loads(result)
            print(result)
            if not result.get("observations"):
                logger.warning("No observations returned from LLM")
                # Create a dummy observation or retry
                self.observation = {"page": "Error loading page", "url": "", "clickables": []}
                # Convert dict to JSON string for embedding compatibility
                obs_content = json.dumps(self.observation) if isinstance(self.observation, dict) else str(self.observation)
                await self.memory.add_memory_piece(
                    Observation(obs_content, self.memory, environment)
                )
                return

            self.observation = result["observations"][0]
            # Convert observation to string for embedding compatibility
            obs_content = json.dumps(self.observation) if isinstance(self.observation, dict) else str(self.observation)
            await self.memory.add_memory_piece(
                Observation(obs_content, self.memory, environment)
            )

    @staticmethod
    def format_memories(memories: list[MemoryPiece], sort_by_kind=True) -> list[str]:
        # sort by kind and timestamp
        if sort_by_kind:
            memories = sorted(memories, key=lambda x: (x.kind, x.timestamp))
        importances_str = [
            f"{m.importance:.2f}" if m.importance != -1 else "N/A" for m in memories
        ]
        memories_str = [
            f"""timestamp: {m.timestamp}; kind: {m.kind}; importance: {i}, content: {m.content}"""
            for m, i in zip(memories, importances_str)
        ]
        return memories_str

    async def feedback(self, obs):
        last_action = None
        last_plan = self.current_plan
        # todo: allow many actions in a timestamp.
        for m in self.memory.memories[::-1]:
            if isinstance(m, Action):
                last_action = m
                break
        assert last_action is not None
        assert last_plan is not None
        with LogApiCall():
            resp = await async_chat(
                [
                    {"role": "system", "content": FEEDBACK_PROMPT},
                    {
                        "role": "user",
                        "content": json.dumps(
                            {
                                "persona": self.persona,
                                "last_action": last_action.raw_action,
                                "last_plan": last_plan.content,
                                "observation": obs,
                            }
                        ),
                    },
                ],
                json_mode=True,
            )
        resp = json.loads(resp)
        logger.info("feedback: %s", resp)
        for thought in resp["thoughts"]:
            await self.memory.add_memory_piece(Thought(thought, self.memory))

    async def reflect(self):
        # we reflect on the most recent memories
        # two most recent memories (last observasion, reflect, plan, action)
        logger.info("reflecting on memories ...")
        # memories = [
        #     i for i in self.memory.memories if i.timestamp >= self.memory.timestamp - 1
        # ]
        memories = self.memory.memories[self.last_reflect_index :]
        self.last_reflect_index = len(self.memory.memories)
        memories = self.format_memories(memories)
        model_input = {
            "current_timestamp": self.memory.timestamp,
            "memories": memories,
            "persona": self.persona,
        }
        # with LogApiCall():
        reflections = await async_chat(
            [
                {"role": "system", "content": REFLECT_PROMPT},
                {"role": "user", "content": json.dumps(model_input)},
            ],
            log=False,
            json_mode=True,
            model="large",
        )
        try:
            parsed = json.loads(reflections)
            insights = parsed.get("insights", [])
            if not isinstance(insights, list):
                insights = [insights] if insights else []
        except (json.JSONDecodeError, TypeError) as e:
            logger.warning(f"Failed to parse reflections: {e}")
            insights = []
        
        logger.info("reflections: %s", insights)
        for r in insights:
            if isinstance(r, str) and r:
                await self.memory.add_memory_piece(Reflection(r, self.memory))
        # todo

        # logger.info(
        #     f"reflecting on {questions}",
        # )
        # reflections = []
        # answers = []
        # requests = [
        #     [
        #         {
        #             "role": "system",
        #             "content": REFLECT_ANSWER_PROMPT,
        #         },
        #         {
        #             "role": "user",
        #             "content": json.dumps(
        #                 {
        #                     "question": q,
        #                     "memories": self.format_memories(
        #                         await self.memory.retrieve(q)
        #                     ),
        #                 }
        #             ),
        #         },
        #     ]
        #     for q in questions
        # ]
        # results = await asyncio.gather(
        #     *[
        #         async_chat(
        #             r,
        #             response_format={"type": "json_object"},
        #         )
        #         for r in requests
        #     ]
        # )
        # for answer in results:
        #     answer = json.loads(answer)
        #     if answer["answer"] != "N/A":
        #         answers.append(answer)
        # try:
        #     for answer in answers:
        #         reflections.append(
        #             Reflection(
        #                 answer["answer"],
        #                 self.memory,
        #                 [memories[i] for i in answer["target"]],
        #             )
        #         )
        # except IndexError as e:
        #     logger.error("Reflection failed: %s", e)
        #     await self.memory.add_memory_piece(
        #         Thought("Reflection failed", self.memory)
        #     )

    async def wonder(self):
        logger.info("wondering ...")
        memories = self.memory.memories[-50:]  # get the last 50 memories
        memories = self.format_memories(memories)
        # with LogApiCall():
        resp = await async_chat(
            [
                {"role": "system", "content": WONDER_PROMPT},
                {
                    "role": "user",
                    "content": json.dumps(
                        {
                            "persona": self.persona,
                            "memories": memories,
                            "intent": self.intent,
                        }
                    ),
                },
            ],
            log=False,
            json_mode=True,
            model="large",
        )
        resp = json.loads(resp)
        logger.info("wondering: %s", resp)
        for thought in resp["thoughts"]:
            await self.memory.add_memory_piece(Thought(thought, self.memory))

    async def plan(self):
        logger.info("planning ...")
        with LogApiCall():
            memories = await self.memory.retrieve(
                self.intent,
                include_recent_observation=True,
                include_recent_action=True,
                include_recent_plan=True,
                include_recent_thought=True,
                trigger_update=False,
                kind_weight={"action": 10, "plan": 10, "thought": 10, "reflection": 10},
            )
            memories = self.format_memories(memories)
            new_plan = ""
            rationale = ""
            while True:
                resp = await async_chat(
                    [
                        {
                            "role": "system",
                            "content": PLANNING_PROMPT,
                        },
                        {
                            "role": "user",
                            "content": json.dumps(
                                {
                                    "persona": self.persona,
                                    "intent": self.intent,
                                    "memories": memories,
                                    "current_timestamp": self.memory.timestamp,
                                    "old_plan": "N/A"
                                    if self.current_plan is None
                                    else self.current_plan.content,
                                }
                            ),
                        },
                    ],
                    json_mode=True,
                    # enable_thinking=True,
                    model="large",
                )
                # # print(resp)
                resp = resp
                resp = json.loads(resp)
                if "plan" in resp and "rationale" in resp and "next_step" in resp:
                    # logger.info(
                    #     "retrieved memory for planning: %s", "\n".join(memories)
                    # )
                    new_plan = resp["plan"]
                    rationale = resp["rationale"] if "rationale" in resp else "N/A"
                    next_step = resp["next_step"]
                    # make sure they are str
                    if isinstance(new_plan, str) and isinstance(rationale, str):
                        break
                logger.info("invalid response, rethinking... ")
                logger.info("response: %s", resp)
        logger.info("plan: %s", new_plan)
        logger.info("rationale: %s", rationale)
        logger.info("next_step: %s", next_step)
        self.current_plan = Plan(new_plan, self.memory, next_step)
        await self.memory.add_memory_piece(Thought(rationale, self.memory))
        await self.memory.add_memory_piece(self.current_plan)

    async def act_cua(self, env, playwright_env):
        import base64
        import json
        from .gpt import chat_gemini_computer_use
        
        try:
            # screenshot_base64 = await playwright_env.screenshot()
            # Use direct page screenshot for JPEG compression to satisfy Gemini
            if playwright_env.page:
                # Check directly if page has screenshot method
                if not hasattr(playwright_env.page, "screenshot"):
                    # logger.error(f"Page object {type(playwright_env.page)} has no screenshot method!")
                    # Fallback to env.screenshot which might handle it (or fail)
                    screenshot_base64 = await playwright_env.screenshot()
                else:
                    screenshot_bytes = await playwright_env.page.screenshot(full_page=False, type="jpeg", quality=50)
                    screenshot_base64 = base64.b64encode(screenshot_bytes).decode("utf-8")
            else:
                 screenshot_base64 = await playwright_env.screenshot()
            
            logger.info(f"Captured screenshot, length: {len(screenshot_base64)}")
        except Exception as e:
            logger.error(f"Failed to capture screenshot: {e}")
            fail_action = {"action": "wait", "duration_ms": 1000}
            await self.memory.add_memory_piece(
                Action("Failed to capture screenshot", self.memory, json.dumps(fail_action))
            )
            return fail_action

        # 2. Prepare Messages
        # We use a simplified history for CUA to avoid token limits with images
        # Ideally, we should persist history with images, but for now we'll do:
        # System Prompt + (Optional: Recent Text History) + User Message (Screenshot + Instruction)
        
        system_prompt = f"""You are a computer use agent.
Persona: {self.persona}
Intent: {self.intent}
Current Plan: {self.current_plan.content if self.current_plan else 'N/A'}
Next Step: {self.current_plan.next_step if self.current_plan else 'N/A'}

You will receive a screenshot of the current state.
Output the next action to take to achieve the goal.
"""
        
        messages = [
            {
                "role": "user",
                "content": [
                    {"type": "text", "text": "Here is the current screen state. What should I do next?"},
                    {
                        "type": "image",
                        "source": {
                            "type": "base64",
                            "media_type": "image/jpeg",
                            "data": screenshot_base64,
                        },
                    },
                ],
            }
        ]

        logger.info("Calling Gemini CUA...")
        with LogApiCall():
            screen_width = 1024
            screen_height = 768
            try:
                viewport = getattr(playwright_env.config.browser.context_options, "viewport", None)
                if viewport:
                    screen_width = int(viewport.get("width", screen_width))
                    screen_height = int(viewport.get("height", screen_height))
            except Exception:
                pass

            response = chat_gemini_computer_use(
                messages,
                system_prompt=system_prompt,
                screen_width=screen_width,
                screen_height=screen_height
            )

        # 3. Parse Response & Convert to WebAgentEnv Action
        try:
            choice = response.choices[0]
            message = choice.message
            tool_calls = message.tool_calls
            
            if tool_calls:
                tool_call = tool_calls[0]
                function_args = json.loads(tool_call.function.arguments)
                tool_name = tool_call.function.name
                action_name = function_args.get("action")
                
                # Map Gemini CUA actions to WebAgentEnv actions
                final_action = {}
                
                if tool_name == "web_browser":
                    if action_name == "goto_url":
                        final_action = {"action": "goto_url", "url": function_args.get("url", "")}
                    elif action_name == "back":
                        final_action = {"action": "back"}
                    elif action_name == "forward":
                        final_action = {"action": "forward"}
                    elif action_name == "new_tab":
                        final_action = {"action": "new_tab", "url": function_args.get("url")}
                    elif action_name == "switch_tab":
                        final_action = {"action": "switch_tab", "tab_id": function_args.get("tab_index", 0)}
                    elif action_name == "close_tab":
                        final_action = {"action": "close_tab", "tab_id": function_args.get("tab_index", 0)}
                    elif action_name == "terminate":
                        final_action = {"action": "terminate", "reason": "CUA requested termination"}
                    else:
                        logger.warning(f"Unmapped CUA browser action: {action_name}")
                        final_action = {"action": "wait", "duration_ms": 1000}

                elif action_name == "mouse_move":
                    coords = function_args.get("coordinate")
                    final_action = {"action": "mouse_move", "x": coords[0], "y": coords[1]}
                    
                elif action_name == "left_click":
                    coords = function_args.get("coordinate")
                    # WebAgentEnv supports mouse_click(at_x, at_y)
                    final_action = {"action": "mouse_click", "at_x": coords[0], "at_y": coords[1]}
                    
                elif action_name == "type":
                    text = function_args.get("text")
                    final_action = {"action": "raw_type", "text": text}
                    
                elif action_name == "key":
                    key = function_args.get("key")
                    final_action = {"action": "key_press", "key": key}

                elif action_name == "cursor_position":
                    coords = function_args.get("coordinate")
                    final_action = {"action": "mouse_move", "x": coords[0], "y": coords[1]}
                
                else:
                    # Fallback for click types not explicitly mapped, or other tools
                    logger.warning(f"Unmapped CUA action: {action_name}")
                    final_action = {"action": "wait", "duration_ms": 1000}

                # Log the action
                logger.info(f"CUA Action: {final_action}")
                
                # Add to memory as an Action
                await self.memory.add_memory_piece(
                    Action(f"CUA Action: {action_name}", self.memory, json.dumps(final_action))
                )
                
                return final_action

            else:
                 logger.warning("No tool calls from Gemini CUA")
                 fallback_action = {"action": "wait", "duration_ms": 1000}
                 await self.memory.add_memory_piece(
                    Action("No tool calls from Gemini", self.memory, json.dumps(fallback_action))
                 )
                 return fallback_action

        except Exception as e:
            logger.error(f"Error parsing CUA response: {e}")
            fallback_action = {"action": "wait", "duration_ms": 1000}
            await self.memory.add_memory_piece(
                Action(f"Error parsing CUA response: {e}", self.memory, json.dumps(fallback_action))
            )
            return fallback_action

    async def act(self, env, playwright_env=None):
        import os
        use_cua = os.getenv("USE_CUA", "false").lower() == "true"
        supports_cua = bool(
            playwright_env
            and getattr(playwright_env, "supports_screenshot", False)
            and getattr(playwright_env, "page", None) is not None
        )
        supports_stagehand_nl = bool(
            playwright_env and getattr(playwright_env, "supports_stagehand_nl", False)
        )

        if use_cua and supports_cua:
            return await self.act_cua(env, playwright_env)
        if use_cua and not supports_cua:
            logger.warning("USE_CUA enabled but environment does not support screenshots; falling back to text action.")

        with LogApiCall():
            last_action = "N/A"
            for m in self.memory.memories[::-1]:
                if isinstance(m, Action):
                    last_action = m.raw_action
                    break

            memories = await self.memory.retrieve(
                self.current_plan.next_step,
                trigger_update=False,
                kind_weight={"observation": 0, "action": 10, "thought": 10},
            )
            memories = self.format_memories(memories)
            assert self.current_plan is not None
            clickables = [e for e in env["clickable_elements"] if e is not None]
            inputs = [e for e in env["clickable_elements"] if e is not None]
            selects = [e for e in env["clickable_elements"] if e is not None]
            if supports_stagehand_nl:
                action_prompt = STAGEHAND_ACTION_PROMPT
                action_payload = {
                    "persona": self.persona,
                    "intent": self.intent,
                    "plan": self.current_plan.content,
                    "next_step": self.current_plan.next_step,
                    "environment": env["html"],
                    "recent_memories": memories,
                    "last_action": last_action,
                    "current_url": env.get("url", ""),
                }
            else:
                action_prompt = ACTION_PROMPT
                action_payload = {
                    "valid_targets": {
                        "inputs": inputs,
                        "clickable": clickables,
                        "selects": selects,
                    },
                    "persona": self.persona,
                    "intent": self.intent,
                    "plan": self.current_plan.content,
                    "next_step": self.current_plan.next_step,
                    "environment": env["html"],
                    "recent_memories": memories,
                }
            action = await async_chat(
                [
                    {"role": "system", "content": action_prompt},
                    {"role": "user", "content": json.dumps(action_payload)},
                ],
                # model="anthropic.claude-3-5-sonnet-20240620-v1:0",
                json_mode=True,
            )
        actions = json.loads(action)
        logger.info("actions: %s", actions)
        planned_action = actions["actions"][0]
        final_action = self._maybe_human_action(env, planned_action, last_action)
        await self.memory.add_memory_piece(
            Action(final_action.get("description", "Action"), self.memory, json.dumps(final_action))
        )

        return final_action

    async def add_thought(self, thought):
        await self.memory.add_memory_piece(Thought(thought, self.memory))
        await self.memory.add_memory_piece(Thought(thought, self.memory))
        await self.memory.add_memory_piece(Thought(thought, self.memory))
        await self.memory.add_memory_piece(Thought(thought, self.memory))
        await self.memory.add_memory_piece(Thought(thought, self.memory))
        await self.memory.add_memory_piece(Thought(thought, self.memory))
