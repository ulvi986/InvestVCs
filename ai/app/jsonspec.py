"""Tiny JSON-schema builders.

The gateway inlines these into the prompt and asks for
`response_format: json_object`, so the schema is a contract we *describe*
rather than one the provider enforces — which is why every agent output also
goes through `normalise.py` before anything downstream touches it.
"""

from __future__ import annotations

import json
from typing import Any, Iterable, Optional

Schema = dict[str, Any]


def string(description: str) -> Schema:
    return {"type": "string", "description": description}


def number(description: str, minimum: Optional[float] = None, maximum: Optional[float] = None) -> Schema:
    schema: Schema = {"type": "number", "description": description}
    if minimum is not None:
        schema["minimum"] = minimum
    if maximum is not None:
        schema["maximum"] = maximum
    return schema


def boolean(description: str) -> Schema:
    return {"type": "boolean", "description": description}


def enum(values: Iterable[str], description: str) -> Schema:
    return {"type": "string", "enum": list(values), "description": description}


def array(items: Schema, description: str) -> Schema:
    return {"type": "array", "items": items, "description": description}


def obj(properties: dict[str, Schema], description: str = "") -> Schema:
    return {
        "type": "object",
        "description": description,
        "properties": properties,
        "required": list(properties.keys()),
    }


EVIDENCE_ITEM = obj({
    "claim": string("The specific claim being made."),
    "evidence": string("The concrete data point, quote or figure supporting it."),
    "source": string('Where it came from, e.g. "pitch_deck: slide 4", "financial_snapshot", "founder_narrative", "model_inference".'),
    "sourceType": enum(
        ["provided", "derived", "inferred", "absent"],
        "provided = stated by the founder; derived = computed from provided data; inferred = your own reasoning; absent = known to be missing.",
    ),
    "confidence": number("0..1 confidence in this specific claim.", 0, 1),
    "reasoning": string("Why the evidence supports the claim."),
})

EVIDENCE_ARRAY = array(
    EVIDENCE_ITEM,
    "Every material claim you make, each tied to its evidence. Never assert something you cannot put here.",
)

RISK_ITEM = obj({
    "category": string('e.g. "market", "technology", "team", "financial", "regulatory", "competitive".'),
    "title": string("Short risk title."),
    "description": string("What could go wrong and why it matters to an investor."),
    "severity": enum(["low", "medium", "high", "critical"], "Impact if it materialises."),
    "likelihood": number("0..1 probability of materialising.", 0, 1),
    "mitigation": string("What would reduce this risk."),
    "evidence": array(string("Evidence supporting that this risk is real."), "Supporting evidence."),
})

RISK_ARRAY = array(RISK_ITEM, "Risks this analysis surfaced. Empty array if genuinely none.")

GAP_ITEM = obj({
    "field": string("The missing field or fact."),
    "why": string("Why it matters for the investment decision."),
    "blocks": array(string("Methodology id."), "Methodology ids whose confidence this gap suppresses."),
    "question": string("The exact question to put to the founder."),
})

#: Fields every methodology agent returns on top of its own `inputs` block.
METHODOLOGY_ENVELOPE: dict[str, Schema] = {
    "headline": string("One sentence stating the result in plain language."),
    "reasoning": string("How you arrived at the assigned inputs. Reference actual figures."),
    "assumptions": array(string("An assumption you had to make."), "Assumptions this result depends on."),
    "limitations": array(string("A limitation of this result."), "What this result cannot tell an investor."),
    "missingInputs": array(string("A required input that was unavailable."), "Inputs you had to guess at."),
    "evidence": EVIDENCE_ARRAY,
    "risks": RISK_ARRAY,
    "confidence": number("0..1 confidence in this methodology's result given the evidence available.", 0, 1),
}


def methodology_schema(inputs: Schema, **extra: Schema) -> Schema:
    return obj({"inputs": inputs, **METHODOLOGY_ENVELOPE, **extra})


def describe(schema: Schema, indent: int = 0) -> str:
    """Render a schema as compact pseudo-JSON for the prompt."""
    pad = "  " * indent
    if schema.get("type") == "object" and schema.get("properties"):
        lines = [
            f'{pad}  "{key}": {describe(value, indent + 1)}'
            for key, value in schema["properties"].items()
        ]
        return "{\n" + ",\n".join(lines) + f"\n{pad}}}"

    if schema.get("type") == "array" and schema.get("items"):
        rendered = describe(schema["items"], indent + 1).strip()
        suffix = f" // {schema['description']}" if schema.get("description") else ""
        return f"[ {rendered} ]{suffix}"

    enum_part = f" one of {json.dumps(schema['enum'])}" if schema.get("enum") else ""
    has_range = "minimum" in schema or "maximum" in schema
    range_part = f" [{schema.get('minimum', '-inf')}..{schema.get('maximum', 'inf')}]" if has_range else ""
    description = f" // {schema['description']}" if schema.get("description") else ""
    return f"<{schema.get('type', 'any')}{enum_part}{range_part}>{description}"
