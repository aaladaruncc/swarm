#!/usr/bin/env python3
"""
Simple local test script to verify page loading fixes.
Run from the UXAgent-master directory.
"""
import asyncio
import os
import sys

# Add src to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from src.simulated_web_agent.main.experiment import experiment_async


async def main():
    # Test with a single persona
    test_personas = [
        {
            "persona": "A curious user exploring a website for the first time",
            "intent": "Explore the homepage and understand what the site offers"
        }
    ]
    
    # Test URL - change this to test different sites
    test_url = os.getenv("TEST_URL", "https://domiq.ai")
    
    print(f"=" * 50)
    print(f"Testing page loading with URL: {test_url}")
    print(f"=" * 50)
    
    results = await experiment_async(
        agents=test_personas,
        start_url=test_url,
        max_steps=3,  # Short test
        headless=False,  # Show browser for debugging
        config_name="base",
        concurrency=1,
    )
    
    print(f"\n" + "=" * 50)
    print("RESULTS:")
    print("=" * 50)
    
    for i, result in enumerate(results):
        print(f"\n--- Agent {i+1} ---")
        print(f"Run ID: {result.get('run_id')}")
        print(f"Steps taken: {result.get('steps_taken')}")
        print(f"Terminated: {result.get('terminated')}")
        print(f"Error: {result.get('error', 'None')}")
        
        # Check observations
        if result.get("observations"):
            print(f"\nObservations:")
            for obs in result["observations"][:3]:  # First 3
                print(f"  Step {obs.get('step')}: html_length={obs.get('html_length')}, url={obs.get('url')}")
        
        # Check actions
        if result.get("actions"):
            print(f"\nActions:")
            for action in result["actions"][:3]:  # First 3
                print(f"  {action}")


if __name__ == "__main__":
    # Set env vars for local testing with BrowserBase
    os.environ["BROWSER_MODE"] = "browserbase"
    os.environ.setdefault("LLM_PROVIDER", "gemini")
    os.environ.setdefault("HEADLESS", "false")
    
    asyncio.run(main())
