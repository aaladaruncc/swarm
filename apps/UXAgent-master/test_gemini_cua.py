#!/usr/bin/env python3
"""
Test script to verify Gemini Computer Use (CUA) integration.
Run from the UXAgent-master directory.
"""
import asyncio
import os
import sys

# Add src to path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from src.simulated_web_agent.main.experiment import experiment_async


async def main():
    # Test with a single persona
    test_personas = [
        {
            "persona": "A user testing computer use capabilities",
            "intent": "Go to google.com and search for 'Gemini 2.0 Flash'",
        }
    ]
    
    # Test URL
    test_url = "https://www.google.com"
    
    print(f"=" * 50)
    print(f"Testing Gemini CUA with URL: {test_url}")
    print(f"=" * 50)
    
    results = await experiment_async(
        agents=test_personas,
        start_url=test_url,
        max_steps=5, 
        headless=False,
        config_name="base",
        concurrency=1,
    )
    
    print(f"\n" + "=" * 50)
    print("RESULTS:")
    print("=" * 50)
    
    for i, result in enumerate(results):
        print(f"\n--- Agent {i+1} ---")
        print(f"Steps taken: {result.get('steps_taken')}")
        
        # Check actions
        if result.get("actions"):
            print(f"\nActions:")
            for action in result["actions"]: 
                print(f"  {action}")


if __name__ == "__main__":
    # Set env vars for CUA testing
    os.environ["USE_CUA"] = "true"
    os.environ["BROWSER_MODE"] = "local"
    os.environ["LLM_PROVIDER"] = "gemini"
    os.environ["HEADLESS"] = "false"
    os.environ["USE_STAGEHAND"] = "false"
    
    # Ensure Google API key is set (assuming it's already in env or .env)
    # os.environ["GEMINI_API_KEY"] = "..." 

    asyncio.run(main())
