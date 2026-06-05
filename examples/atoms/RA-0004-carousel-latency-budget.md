---
id: RA-0004
intent: "Render the recommendation carousel within a 200ms latency budget"
status: draft
kind: nonfunctional
who: "Recommendation service (owner: Product Owner)"
where: "recommendation carousel"
when: "on each carousel render"
what: "The carousel renders within the latency budget"
how_well: "≤ 200 ms"
else: null
limit: null
signal: "carousel_render_ms"
assumptions: []
guards: []
observers: ["renderLatency(carousel)"]
bindings: ["telemetry.carousel_render_ms"]
forml: |
  requirement RA-0004 =
    when carouselRender
    check (renderLatency <= 200) ;
scenarios:
  nominal:
    - "Carousel renders in ≤ 200 ms under nominal load"
  negative:
    - "Render exceeding 200 ms is flagged as a violation"
verdict_policy: "latency violation is blocking for release"
levels: [4]
relations:
  depends_on: []
  refines: []
  conflicts_with: []
  superseded_by: null
source:
  - transcript: "2024-01-15_sample-elicitation_cleaned.md"
    timecode: "00:08:30"
    speaker: "Product Owner"
    quote: "the carousel should render within 200 milliseconds."
jira: []
glossary_terms: ["latency", "carousel"]
confidence: 0.8
extracted_by: "atomize-from-latest v0.1 (example)"
extracted_at: "2024-01-16"
---

## Intent
A non-functional latency budget for the carousel. This is the kind of *quantitative/temporal*
requirement where FORM-L's `how_well` slot carries real content (a measurable SLO).

## Source quotes
- `[00:08:30]` **Product Owner:** «the carousel should render within 200 milliseconds.»

## Open questions
- Is 200 ms a p50, p95, or hard ceiling? (confirm with SME)
