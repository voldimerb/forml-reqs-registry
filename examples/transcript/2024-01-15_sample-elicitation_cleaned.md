# Sample elicitation — Recommendation carousel (synthetic, cleaned)

> **Synthetic** transcript for demonstrating the FORM-L atom pipeline. No real data; any
> resemblance to a real project is coincidental. Format mirrors a cleaned Teams/Stream
> transcript: `[HH:MM:SS] **Speaker:** line`.

[00:00:05] **Product Owner:** Thanks everyone. Today we scope the recommendation carousel on the product pages.

[00:03:12] **Product Owner:** We should hide out-of-stock items from the carousel, but the category page must still show the full catalog.

[00:03:40] **Engineer:** So the carousel filters out out-of-stock, but we don't touch the catalog count. What about brand-new SKUs that don't have a stock signal yet?

[00:04:02] **Product Owner:** If we don't know the stock status — a new SKU — don't exclude it. Keep it in.

[00:05:25] **Domain Expert:** Another rule: products without an active supplier contract shouldn't appear in recommendations at all.

[00:06:10] **Domain Expert:** One exception, though — our own-brand products should never be excluded for a missing contract. They're always eligible.

[00:08:30] **Product Owner:** For performance, the carousel should render within 200 milliseconds.

[00:11:45] **Product Owner:** We also floated some kind of "trending" badge, but the rules for it aren't defined yet — let's figure that out later.

[00:12:10] **Engineer:** Agreed, the badge needs its own session.
