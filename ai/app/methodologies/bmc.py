"""Business Model Canvas analysis."""

from __future__ import annotations

from typing import Any, Optional

from ..jsonspec import array, methodology_schema, number, obj, string
from ..schemas import ComputeOutput, InputBundle, StartupProfile
from .base import Applicability, ComputeContext, InputSpec, MethodologySpec, clamp

BMC_BLOCK_KEYS = [
    "key_partners", "key_activities", "key_resources", "value_propositions",
    "customer_relationships", "channels", "customer_segments",
    "cost_structure", "revenue_streams",
]


def bmc_filled_blocks(canvas: Optional[dict[str, str]]) -> list[str]:
    return [key for key in BMC_BLOCK_KEYS if str((canvas or {}).get(key) or "").strip()]


def _compute(inputs: dict[str, Any], ctx: ComputeContext) -> ComputeOutput:
    blocks = inputs.get("blocks") or {}
    scores = [clamp((blocks.get(key) or {}).get("score10"), 0, 10, 0) for key in BMC_BLOCK_KEYS]
    coherence = clamp(inputs.get("coherenceScore10"), 0, 10, 0)

    founder_supplied = len(bmc_filled_blocks(ctx.bundle.bmc))

    # Block scores carry 70%; whether the blocks hang together as one business
    # carries 30% — nine strong-but-unrelated blocks are not a model.
    block_average = sum(scores) / len(scores)
    score10 = round(block_average * 0.7 + coherence * 0.3, 1)

    weakest = sorted(
        ({"key": key, "score": score} for key, score in zip(BMC_BLOCK_KEYS, scores)),
        key=lambda item: item["score"],
    )[:3]

    if founder_supplied == 0:
        notes = ["The founder did not supply a Business Model Canvas; this one was reconstructed from the deck and narrative."]
        penalty = 0.2
    elif founder_supplied < len(BMC_BLOCK_KEYS):
        notes = [f"The founder filled {founder_supplied} of {len(BMC_BLOCK_KEYS)} canvas blocks; the rest were inferred."]
        penalty = (1 - founder_supplied / len(BMC_BLOCK_KEYS)) * 0.25
    else:
        notes, penalty = [], 0.0

    return ComputeOutput(
        score10=score10,
        computed={
            "blockScores": dict(zip(BMC_BLOCK_KEYS, scores)),
            "blockAverage": round(block_average, 1),
            "coherenceScore10": coherence,
            "weakestBlocks": weakest,
            "founderFilledBlocks": founder_supplied,
            "derivedFromDeck": founder_supplied == 0,
        },
        confidencePenalty=penalty,
        notes=notes,
    )


def _gate(_profile: StartupProfile, bundle: InputBundle) -> Applicability:
    filled = len(bmc_filled_blocks(bundle.bmc))
    return Applicability(
        True, 0.9 if filled >= 5 else 0.65,
        f"The founder filled {filled} canvas blocks, giving a first-hand account of the business model to grade."
        if filled >= 5 else
        "No founder canvas on file, so the model will be reconstructed from the deck — worth doing, because gaps in the "
        "reconstruction are themselves a finding.",
    )


def _block(label: str):
    return obj({
        "content": string(f"What the company's {label} actually is, in one or two sentences. Reconstruct it from the deck if the founder did not state it."),
        "score10": number(f"0-10 strength of the {label} block.", 0, 10),
        "assessment": string("Why it scores that, and what would make it stronger."),
        "evidenceSource": string('Where this came from: "founder_canvas", "pitch_deck", "narrative" or "inferred".'),
    })


SPEC = MethodologySpec(
    id="business_model_canvas",
    name="Business Model Canvas",
    family="business_model",
    description="Reconstructs and grades the nine Business Model Canvas blocks and tests whether they cohere into one business.",
    purpose="Exposes where the business model is asserted rather than designed — usually in channels, cost structure or customer relationships.",
    required_inputs=[
        InputSpec("valueProp", "Value proposition", "What the company sells and to whom."),
        InputSpec("customers", "Customer segments", "Who pays."),
    ],
    optional_inputs=[
        InputSpec("canvas", "Founder canvas", "A canvas the founder already filled in."),
        InputSpec("costs", "Cost structure", "Where the money goes."),
    ],
    output_schema=methodology_schema(obj({
        "blocks": obj({key: _block(key.replace("_", " ")) for key in BMC_BLOCK_KEYS}),
        "coherenceScore10": number("0-10: do the nine blocks describe one coherent business, or nine disconnected assertions?", 0, 10),
        "coherenceAssessment": string("Where the model contradicts itself or leaves a gap between cost structure and revenue streams."),
        "strengths": array(string("A genuine strength of the business model."), "Strengths."),
        "weaknesses": array(string("A weakness of the business model."), "Weaknesses."),
    })),
    applicable_stages=["idea", "pre_seed", "seed", "series_a", "growth"],
    base_confidence=0.72,
    limitations=[
        "Descriptive, not predictive — a coherent canvas is not evidence that the model works.",
        "Blocks reconstructed from a deck reflect what the founder chose to present, not the full business.",
    ],
    priority=20,
    instruction=(
        "Reconstruct all nine Business Model Canvas blocks for this company from whatever material is available, then grade each "
        "0-10 and assess whether they cohere. Mark each block with where its content came from. Where a block cannot be "
        "reconstructed at all, say so and score it low rather than inventing plausible content."
    ),
    compute=_compute,
    gate=_gate,
)
