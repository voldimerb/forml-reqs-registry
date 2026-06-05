---
id: RA-0002
intent: "Exclude products without an active supplier contract from recommendations"
status: draft
kind: business_rule
who: "Recommendation service (owner: Domain Expert)"
where: "recommendation carousel; product = SKU"
when: "on each carousel render"
what: "Products without an active supplier contract are excluded from recommendations"
how_well: "N/A (boolean exclusion)"
else: null
limit: null
signal: "excluded_no_contract flag"
assumptions:
  - "contract status is available per SKU"
guards: []
observers: ["hasActiveContract(sku)"]
bindings: ["supplier.contract_status"]
forml: |
  requirement RA-0002 =
    when carouselRender
    check hasActiveContract(sku) ;
scenarios:
  nominal:
    - "SKU with no active contract is omitted from recommendations"
  negative:
    - "SKU with an active contract is kept"
verdict_policy: null
levels: [4]
relations:
  depends_on: []
  refines: []
  conflicts_with: []
  superseded_by: null
source:
  - transcript: "2024-01-15_sample-elicitation_cleaned.md"
    timecode: "00:05:25"
    speaker: "Domain Expert"
    quote: "products without an active supplier contract shouldn't appear in recommendations at all."
jira: []
glossary_terms: ["supplier contract", "SKU"]
confidence: 0.7
extracted_by: "atomize-from-latest v0.1 (example)"
extracted_at: "2024-01-16"
---

## Intent
Products without an active supplier contract are not eligible for the recommendation carousel.
See RA-0003 for the own-brand exception that **refines** this rule.

## Source quotes
- `[00:05:25]` **Domain Expert:** «products without an active supplier contract shouldn't appear in recommendations at all.»

## Open questions
- (none)
