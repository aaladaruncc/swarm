import asyncio
import os
import logging
from src.simulated_web_agent.main.experiment import experiment_async

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

async def main():
    # Define a simple persona and intent
    agents = [
        {
            "persona": "A helpful assistant.",
            "intent": "Go to google.com and search for 'Stagehand CUA'.",
        }
    ]

    print("==================================================")
    print("Testing Stagehand CUA with URL: https://www.google.com")
    print("==================================================")

    try:
        results = await experiment_async(
            agents=agents,
            start_url="https://www.google.com",
            max_steps=5,
            headless=False,  # Run visibly
            concurrency=1
        )
        
        print("\n==================================================")
        print("RESULTS:")
        print("==================================================")
        
        for i, res in enumerate(results):
            print(f"\n--- Agent {i+1} ---")
            if "error" in res and res["error"]:
                print(f"Error: {res['error']}")
            else:
                steps = res.get("steps_taken", 0)
                print(f"Steps taken: {steps}")
                print("\nActions taken:")
                for action in res.get("actions", []):
                     print(f"  {action}")
            
            # Check if execution involved Stagehand
            # (We can't easily check internal class types here, but success is a good proxy)

    except Exception as e:
        print(f"\nTest failed with error: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    # Set env vars for Stagehand CUA testing
    os.environ["USE_STAGEHAND"] = "true"
    os.environ["BROWSER_MODE"] = "local"
    # Stagehand uses its own model config, but we need to set standard vars too
    os.environ["LLM_PROVIDER"] = "gemini" 
    os.environ["STAGEHAND_MODEL_NAME"] = "google/gemini-2.0-flash"
    os.environ["USE_CUA"] = "false" # Ensure custom CUA is disabled
    os.environ["HEADLESS"] = "false"
    
    # Ensure API Key is present (it should be in env already)
    # if "GEMINI_API_KEY" not in os.environ:
    #     print("WARNING: GEMINI_API_KEY not set!")

    asyncio.run(main())
