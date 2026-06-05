---
id: RA-0001
intent: "Exclude out-of-stock products from the recommendation carousel without shrinking the catalog page"
status: draft
kind: business_rule
who: "Recommendation service (owner: Product Owner)"
where: "recommendation carousel; product = SKU × store"
when: "on each carousel render"
what: "Products flagged out-of-stock are removed from the recommendation carousel"
how_well: "N/A (boolean exclusion)"
else: "if stock status is unknown (new SKU) — do not exclude (fallback: keep)"
limit: "must not change the number of products shown on the category/catalog page"
signal: "excluded_from_carousel flag"
assumptions:
  - "stock status is available per SKU from the inventory service"
guards:
  - "stock feed is not older than the agreed refresh window"
observers: ["stockStatus(sku)"]
bindings: ["inventory.stock_status"]
forml: |
  requirement RA-0001 =
    when carouselRender
    check (not outOfStock(sku)) ;
scenarios:
  nominal:
    - "Out-of-stock SKU is omitted from the carousel"
  negative:
    - "New SKU (unknown stock) is NOT excluded"
    - "Catalog page product count is unchanged after exclusion"
verdict_policy: "negative scenarios must pass before release"
levels: [4]
relations:
  depends_on: []
  refines: []
  conflicts_with: []
  superseded_by: null
source:
  - transcript: "2024-01-15_sample-elicitation_cleaned.md"
    timecode: "00:03:12"
    speaker: "Product Owner"
    quote: "We should hide out-of-stock items from the carousel, but the category page must still show the full catalog."
  - transcript: "2024-01-15_sample-elicitation_cleaned.md"
    timecode: "00:04:02"
    speaker: "Product Owner"
    quote: "If we don't know the stock status — a new SKU — don't exclude it. Keep it in."
jira: ["SHOP-101"]
glossary_terms: ["carousel", "SKU", "out-of-stock"]
confidence: 0.7
extracted_by: "atomize-from-latest v0.1 (example)"
extracted_at: "2024-01-16"
---

## Intent
Hide out-of-stock products from the recommendation carousel, while the category/catalog page keeps
showing the full assortment. Unknown stock (a brand-new SKU) is treated as "keep", not "exclude".

## Source quotes
- `[00:03:12]` **Product Owner:** «We should hide out-of-stock items from the carousel, but the category page must still show the full catalog.»
- `[00:04:02]` **Product Owner:** «If we don't know the stock status — a new SKU — don't exclude it. Keep it in.»

## Open questions
- Is "out-of-stock" a strict boolean, or is there a threshold (e.g. < N units)? (confirm with SME) — `how_well` left as boolean for now.
