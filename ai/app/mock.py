"""Canned agent output for local UI work and CI.

Enabled with AI_MOCK=1. It exercises the real orchestrator, the real
deterministic compute and the real graph — only the model call is replaced —
so the pipeline can be developed and demonstrated without Azure credentials.
"""

from __future__ import annotations

from typing import Any

from . import custom, registry

_EVIDENCE = [{
    "claim": "The company reports 24 paying customers",
    "evidence": "Stated on the traction slide",
    "source": "pitch_deck: traction",
    "sourceType": "provided",
    "confidence": 0.85,
    "reasoning": "Taken directly from the founder's own material.",
}]

_RISKS = [{
    "category": "financial",
    "title": "Runway is short relative to the plan",
    "description": "The stated runway does not cover the milestones the raise is meant to fund.",
    "severity": "high",
    "likelihood": 0.55,
    "mitigation": "Close the round earlier or reduce burn.",
    "evidence": ["Runway figure in the financial snapshot"],
}]


def _envelope(headline: str, **extra: Any) -> dict[str, Any]:
    return {
        "headline": headline,
        "reasoning": "Mock output: the deterministic layer still runs on these assigned inputs.",
        "assumptions": ["Mock run. Figures are illustrative, not analysed."],
        "limitations": [],
        "missingInputs": [],
        "evidence": _EVIDENCE,
        "risks": _RISKS,
        "confidence": 0.7,
        **extra,
    }


_METHODOLOGY_INPUTS: dict[str, dict[str, Any]] = {
    "berkus": {"components": {
        key: {"score": 3, "justification": "Mock justification."}
        for key in ["sound_idea", "prototype", "team", "strategic", "traction"]
    }},
    "scorecard": {
        "medianPreMoneyUsd": 3_000_000, "medianLowUsd": 2_400_000, "medianHighUsd": 3_800_000,
        "medianBasis": "Mock sector norm.",
        "factors": {
            key: {"score": score, "justification": "Mock justification."}
            for key, score in zip(
                ["team", "market", "product", "competitive", "sales", "financing", "other"],
                [120, 120, 100, 80, 100, 100, 100],
            )
        },
    },
    "risk_factor": {"baseValuationUsd": 2_000_000, "baseBasis": "Mock comparables.", "factors": {
        key: {"score": 0, "justification": "Mock."} for key in [
            "management", "stage", "legislation", "supply", "sales_marketing", "funding",
            "competition", "technology", "international", "reputation", "exit", "political",
        ]
    }},
    "vc_method": {
        "exitYearRevenueUsd": 10_000_000, "revenueBasis": "Mock projection.", "netIncomeMarginPct": 20,
        "exitMultiple": 5, "exitMultipleLow": 3, "exitMultipleHigh": 7, "multipleBasis": "Mock sector multiple.",
        "yearsToExit": 5, "requiredIrrPct": 30, "investmentAmountUsd": 1_500_000,
    },
    "first_chicago": {
        "exitYearRevenueUsd": 10_000_000, "exitMultiple": 5, "yearsToExit": 5, "basis": "Mock.",
        "scenarios": {
            "worst": {"narrative": "Mock worst case.", "probabilityPct": 20, "discountRatePct": 50},
            "base": {"narrative": "Mock base case.", "probabilityPct": 70, "discountRatePct": 30},
            "best": {"narrative": "Mock best case.", "probabilityPct": 10, "discountRatePct": 20},
        },
    },
    "readiness_levels": {
        "trl": {"level": 7, "levelName": "Demonstrated", "justification": "Mock.", "blockersToNextLevel": []},
        "crl": {"level": 5, "levelName": "Validated demand", "justification": "Mock.", "blockersToNextLevel": []},
        "frl": {"level": 4, "levelName": "Credible plan", "justification": "Mock.", "blockersToNextLevel": []},
        "gapAnalysis": "Technology runs ahead of commercial readiness.",
    },
    "market_analysis": {
        "marketDefinition": "Mock market definition.",
        "tamUsd": 5_000_000_000, "samUsd": 400_000_000, "somUsd": 20_000_000,
        "sizingMethod": "bottom_up", "sizingBasis": "Mock bottom-up derivation.", "growthRatePct": 14,
        "attractivenessScore10": 8, "sizingCredibilityScore10": 7, "timingScore10": 7,
        "whyNow": "Mock catalyst.", "customerEvidence": "24 paying customers.",
        "segments": ["SMB operations"], "headwinds": ["Long procurement cycles"], "isRegulated": False,
    },
    "competitive_analysis": {
        "competitors": [{"name": "Incumbent suite", "type": "direct", "strength": "Distribution", "weakness": "Slow"}],
        "positionScore10": 6, "defensibilityScore10": 5, "moats": ["switching_costs"],
        "moatEvidence": "Workflow data accumulates in the product.",
        "differentiation": "Faster setup.", "threatOfEntry": "Moderate.", "concentrationRisk": "None material.",
    },
    "business_model_canvas": {
        "blocks": {
            key: {"content": "Mock content.", "score10": 7, "assessment": "Mock.", "evidenceSource": "pitch_deck"}
            for key in [
                "key_partners", "key_activities", "key_resources", "value_propositions",
                "customer_relationships", "channels", "customer_segments", "cost_structure", "revenue_streams",
            ]
        },
        "coherenceScore10": 7, "coherenceAssessment": "Blocks are consistent.",
        "strengths": ["Clear value proposition"], "weaknesses": ["Channels are thin"],
    },
    "financial_analysis": {
        "healthScore10": 6, "runwayAssessment": "Mock runway assessment.", "burnAssessment": "Proportionate.",
        "marginAssessment": "Consistent with SaaS.", "unitEconomics": "LTV/CAC not computable from the data supplied.",
        "churnAssessment": "Low.", "benchmarks": ["Rule of thumb: 18 months runway at seed"], "redFlags": [],
    },
    "team_traction": {
        "teamScore10": 7, "founderMarketFit": "Mock founder-market fit.", "teamGaps": ["Sales lead"],
        "hasTechnicalCofounder": True, "keyPersonRisk": "Moderate.",
        "tractionScore10": 6, "strongestTractionEvidence": "paying_customers",
        "tractionNarrative": "24 customers over 12 months.", "growthEvidence": "3x year on year.",
    },
    "risk_analysis": {
        "risks": _RISKS,
        "killRisk": "Running out of cash before the round closes.",
        "unknowns": ["Audited financials"],
    },
}


def mock_output(role: str, context: Any) -> dict[str, Any]:
    if role == "understand":
        return {
            "name": (context or {}).get("startupName") or "Mock Startup",
            "oneLiner": "A mock company used to exercise the pipeline without a model.",
            "stage": "seed",
            "stageRationale": "Mock: revenue present and a small team.",
            "industries": ["saas"],
            "geography": "Not stated",
            "businessModel": {
                "type": "B2B SaaS", "revenueModel": "Subscription", "pricing": "Not stated",
                "customerType": "SMB", "unitEconomicsKnown": True, "notes": "Mock.",
            },
            "market": {
                "description": "Mock market.", "tam": 5_000_000_000, "sam": 400_000_000, "som": 20_000_000,
                "growthRatePct": 14, "sizingBasis": "Mock.", "notes": "",
            },
            "product": {"description": "Mock product.", "maturity": "beta", "differentiation": "Mock.", "notes": ""},
            "technology": {
                "description": "Mock stack.", "coreTech": "Nothing novel", "trlEstimate": 7,
                "ipPosition": "None stated", "technicalRisk": "Low.", "notes": "",
            },
            "team": {"size": 6, "founders": "Two technical founders.", "domainExpertise": "Mock.", "gaps": "Sales.", "notes": ""},
            "traction": {"customers": 24, "revenueUsd": 180_000, "growthNote": "3x YoY.", "pilots": "", "notes": ""},
            "competition": {
                "landscape": "Fragmented.", "namedCompetitors": ["Incumbent suite"],
                "defensibility": "Workflow lock-in.", "notes": "",
            },
            "financials": {
                "monthlyBurnUsd": 40_000, "runwayMonths": 11, "grossMarginPct": 74, "churnRatePct": 3, "notes": "",
            },
            "fundraising": {"seeking": 1_500_000, "instrument": "SAFE", "useOfFunds": "Sales hires.", "notes": ""},
            "riskFlags": ["Mock run. No real analysis was performed."],
            "dataGaps": [{
                "field": "Audited financials", "why": "Revenue is unverified.",
                "blocks": ["vc_method"], "question": "Can you share audited accounts?",
            }],
            "evidence": _EVIDENCE,
        }

    if role == "select":
        candidates = {item["id"] for item in ((context or {}).get("candidateMethodologies") or [])}
        return {
            "strategy": "Mock plan: apply the methodologies whose inputs this company can supply.",
            "focus": ["market", "unit economics"],
            "notes": "Mock run. Selection is not a real judgement.",
            "selections": [
                {
                    "methodologyId": spec.id,
                    "selected": spec.id in candidates,
                    "reason": f"Mock selection reason for {spec.name}.",
                    "expectedConfidence": 0.7,
                }
                for spec in registry.active()
            ],
        }

    if role == "methodology":
        methodology_id = ((context or {}).get("methodology") or {}).get("id", "")
        spec = registry.get(methodology_id)

        # A user-defined agent has no canned inputs of its own, so the mock
        # answers its generic schema instead of returning an empty envelope.
        if custom.is_custom(methodology_id):
            inputs = {
                "assessment": f"Mock assessment from the custom agent {spec.name if spec else methodology_id}.",
                "score10": 6.0,
                "findings": ["Mock finding from a user-defined agent."],
                "concerns": ["Mock run: no real analysis was performed."],
                "unknowns": ["Everything. This is mock output."],
            }
        else:
            inputs = _METHODOLOGY_INPUTS.get(methodology_id, {})

        return _envelope(f"{spec.name if spec else methodology_id}: mock result", inputs=inputs)

    if role == "critic":
        disagreements = (context or {}).get("detectedDisagreements") or []
        return {
            "verdict": "pass",
            "summary": "Mock critique. No real adversarial review was performed.",
            "unsupportedAssumptions": [],
            "contradictions": [],
            "redFlags": [],
            "biasChecks": ["Mock run: treat every figure here as illustrative."],
            "credibilityChecks": [{"topic": "Market size", "assessment": "Not verified in mock mode.", "credible": False}],
            "disagreementAnalysis": [
                {
                    "id": item.get("id"),
                    "rootCause": "Mock: the methods rest on different anchors.",
                    "moreCredible": "unresolved",
                    "explanation": "Mock explanation.",
                    "missingInfo": ["Audited revenue"],
                }
                for item in disagreements
            ],
            "reconciliation": {
                "explanation": "Mock reconciliation: the range spans the methods rather than averaging them.",
                "keyAssumptions": ["Mock comparables hold"],
                "exclude": [],
                "reweight": [],
            },
            "missingInformation": [{
                "field": "Audited financials", "why": "Revenue is unverified.",
                "blocks": ["vc_method"], "question": "Can you share audited accounts?",
            }],
            "rerunRequests": [],
            "confidenceCeiling": 0.5,
        }

    if role == "synthesis":
        return {
            "executiveSummary": "Mock executive summary. This analysis was produced without a model and carries no judgement.",
            "thesis": "Mock investment thesis.",
            "sections": [{
                "key": "market", "title": "Market Opportunity", "score10": 8, "confidence": 0.6,
                "narrative": "Mock narrative referencing the mock figures.",
                "evidence": ["24 paying customers"], "keyAssumptions": ["Mock"], "missingInformation": ["Bottom-up sizing"],
            }],
            "valuationAssumptions": ["Mock comparables hold"],
            "bullCase": {"label": "Bull", "narrative": "Mock bull case.", "probability": 0.2, "valuationUsd": 5_000_000, "drivers": ["Mock"]},
            "baseCase": {"label": "Base", "narrative": "Mock base case.", "probability": 0.6, "valuationUsd": 3_000_000, "drivers": ["Mock"]},
            "bearCase": {"label": "Bear", "narrative": "Mock bear case.", "probability": 0.2, "valuationUsd": 1_000_000, "drivers": ["Mock"]},
            "recommendation": "consider",
            "recommendationReasoning": "Mock reasoning. Do not act on this.",
            "topRisks": _RISKS,
            "nextSteps": ["Run the analysis with real credentials"],
        }

    if role == "compare":
        return {
            "summary": "Mock comparison.",
            "dimensions": [{
                "dimension": "market", "aScore10": 7, "bScore10": 6, "winner": "a", "reasoning": "Mock reasoning.",
            }],
            "evidenceQualityNote": "Mock run. Evidence quality was not assessed.",
            "recommendedStartup": "neither",
            "recommendation": "Mock recommendation.",
            "reasoning": "Mock reasoning.",
            "confidence": 0.3,
            "conditions": ["Run with real credentials"],
        }

    return {}
