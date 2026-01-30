
#!/usr/bin/env python3
"""
Simple test script for hallbayes with OpenRouter backend
"""

import os
from pathlib import Path
from hallbayes import OpenAIPlanner, OpenAIItem, generate_answer_if_allowed
from hallbayes.htk_backends import OpenRouterBackend
from hallbayes import OpenAIBackend, OpenAIItem, OpenAIPlanner

def load_env():
    """Load .env file if it exists"""
    env_path = Path(__file__).parent / ".env"
    if env_path.exists():
        with open(env_path) as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith('#') and '=' in line:
                    key, value = line.split('=', 1)
                    if value:  # Only set if value is not empty
                        os.environ[key.strip()] = value.strip()

def main():
    # Load .env file
    load_env()

    # Check for API key
    # api_key = os.environ.get("OPENROUTER_API_KEY")
    # if not api_key:
    #     print("❌ OPENROUTER_API_KEY not found in environment")
    #     print("Please set it in .env file")
    #     return

    # print("✅ Found OPENROUTER_API_KEY")
    # print("\n" + "="*60)
    print("Testing HallBayes with OpenRouter")
    print("="*60 + "\n")

    # Create OpenRouter backend
    # backend = OpenRouterBackend(
    #     # model="anthropic/claude-sonnet-4.5",  # Use Claude Sonnet 4.5
    #     # model="x-ai/grok-4-fast",
    #     model="google/gemini-2.5-flash-lite-preview-09-2025",
    #     http_referer="https://github.com/leochlon/hallbayes",
    #     x_title="HallBayes Test Script",
    # )

    # Create planner with the backend
    # planner = OpenAIPlanner(
    #     backend=backend,
    #     temperature=0.3,
    # )
    backend = OpenAIBackend(model="gpt-4o-mini")
    planner = OpenAIPlanner(backend, temperature=0.3)

    # item = OpenAIItem(
    #     prompt="Who won the 2026 Nobel Prize in Physics?",
    #     n_samples=7,
    #     m=6,
    #     skeleton_policy="closed_book"
    # )

    # Single simple test
    prompt = "Please find if there are any potential problems with the following part of a contract: 5.3 Unilateral Suspension. Provider reserves the right to suspend access to the Services immediately, without prior notice, if Provider determines in its sole discretion that continued access poses a security risk, violates this Agreement, or is necessary to protect Provider's systems or other clients. During any suspension, Client shall remain obligated to pay all applicable fees."

    # Single simple test
    # prompt = "Who won the 2019 Nobel Prize in Physics?"

    print(f"Prompt: {prompt}\n")

    item = OpenAIItem(
        prompt=prompt,
        n_samples=3,  # Minimal samples for speed
        m=4,
        skeleton_policy="closed_book"
    )

    try:
        print("⏳ Running EDFL evaluation...\n")
        metrics = planner.run(
            [item],
            h_star=0.05,          # Target 5% hallucination max
            isr_threshold=1.0,    # Standard ISR gate
            margin_extra_bits=0.2,
            B_clip=12.0,
            clip_mode="one-sided"
        )

        m = metrics[0]
        print("📊 Results:")
        print(f"  Decision: {'✅ ANSWER' if m.decision_answer else '⛔ REFUSE'}")
        print(f"  RoH Bound: {m.roh_bound:.3f} ({m.roh_bound*100:.1f}% max hallucination risk)")
        print(f"  ISR: {m.isr:.3f}")
        print(f"  B2T Required: {m.b2t:.3f} nats")
        print(f"  Delta (Info Budget): {m.delta_bar:.3f} nats")
        print(f"  Prior (avg): {m.q_avg:.3f}")
        print(f"  Prior (worst): {m.q_conservative:.3f}")

        if m.rationale:
            print(f"\n💭 Rationale: {m.rationale}")

        # Generate actual answer if allowed
        if m.decision_answer:
            print("\n" + "─"*60)
            print("Generating answer...")
            try:
                # Use backend directly for answer generation
                answer_msgs = [
                    {"role": "system", "content": "You are a precise assistant. Provide a concise, well-grounded answer."},
                    {"role": "user", "content": prompt}
                ]
                resp = backend.chat_create(answer_msgs, max_tokens=256, temperature=0.3)

                # Handle OpenRouter response format
                if isinstance(resp, dict):
                    choices = resp.get("choices", [])
                    if choices:
                        answer = choices[0].get("message", {}).get("content", "")
                    else:
                        answer = ""
                else:
                    # Fallback to standard format
                    answer = resp.choices[0].message.content or ""

                if answer:
                    print(f"\n💬 Answer:\n{answer}")
                else:
                    print("\n⚠️  No answer generated")
            except Exception as e:
                print(f"\n❌ Error generating answer: {e}")
            print("─"*60)
        print("\n" + "="*60)
        print("✅ Test complete!")
        print("="*60)

    except Exception as e:
        print(f"\n❌ Error: {e}")
        import traceback
        traceback.print_exc()

main()

