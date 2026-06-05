---
id: RA-0003
intent: "Do not exclude own-brand products for a missing supplier contract (exception to RA-0002)"
status: draft
kind: business_rule
who: "Recommendation service (owner: Domain Expert)"
where: "recommendation carousel; product = SKU (own-brand)"
when: "on each carousel render"
what: "Own-brand products are always eligible; the missing-contract exclusion (RA-0002) does NOT apply to them"
how_well: "N/A (boolean exception)"
else: null
limit: null
signal: "exempt_own_brand flag"
assumptions:
  - "own-brand flag is available per SKU"
guards: []
observers: ["isOwnBrand(sku)"]
bindings: ["catalog.own_brand_flag"]
forml: null
scenarios:
  nominal:
    - "Own-brand SKU with no contract is STILL kept in recommendations"
  negative:
    - "Non-own-brand SKU with no contract is excluded (RA-0002 applies)"
verdict_policy: null
levels: [4]
relations:
  depends_on: []
  refines: ["RA-0002"]
  conflicts_with: []
  superseded_by: null
source:
  - transcript: "2024-01-15_sample-elicitation_cleaned.md"
    timecode: "00:06:10"
    speaker: "Domain Expert"
    quote: "our own-brand products should never be excluded for a missing contract. They're always eligible."
jira: []
glossary_terms: ["own-brand", "supplier contract", "SKU"]
confidence: 0.7
extracted_by: "atomize-from-latest v0.1 (example)"
extracted_at: "2024-01-16"
---

## Intent
An **exception** to RA-0002: own-brand products are never excluded for a missing supplier contract.

## Source quotes
- `[00:06:10]` **Domain Expert:** «our own-brand products should never be excluded for a missing contract. They're always eligible.»

## Open questions
- ⚠️ **Dedup (G1) demo:** RA-0003 and RA-0002 share WHERE and overlap heavily on WHAT, yet they are
  *opposite in effect*. A similarity-only dedup key would merge them. Correct handling is
  `RA-0003 refines RA-0002` — adjudicated by a human, not by string/embedding similarity.
