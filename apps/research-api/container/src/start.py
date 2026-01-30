from hallbayes import OpenAIItem, OpenAIPlanner
from hallbayes.htk_backends import OpenRouterBackend

backend = OpenRouterBackend(
    model="google/gemini-2.5-flash",
    http_referer="https://github.com/leochlon/hallbayes",
    x_title="HallBayes Test Script"
)
planner = OpenAIPlanner(backend, temperature=0.3)

item = OpenAIItem(
    prompt="Who won the 2026 Nobel Prize in Physics?",
    n_samples=7,
    m=6,
    skeleton_policy="closed_book"
)

metrics = planner.run(
    [item], 
    h_star=0.05,           # Target 5% hallucination max
    isr_threshold=1.0,     # Standard ISR gate
    margin_extra_bits=0.2, # Safety margin
    B_clip=12.0,          # Clipping bound
    clip_mode="one-sided" # Conservative mode
)

for m in metrics:
    print("\n" + "="*60)
    print(f"Decision: {'✅ ANSWER' if m.decision_answer else '⛔ REFUSE'}")
    print(f"Hallucination Risk: {m.roh_bound*100:.2f}% (max bound)")
    print(f"ISR (Info Sufficiency Ratio): {m.isr:.3f}")
    print(f"Information Budget (Δ̄): {m.delta_bar:.2f} nats")
    print(f"Bits to Trust (B2T): {m.b2t:.3f} nats")
    print(f"Prior Probability (avg): {m.q_avg:.3f}")
    print(f"Prior Probability (conservative): {m.q_conservative:.3f}")
    if m.rationale:
        print(f"\nRationale: {m.rationale}")
    print("="*60)