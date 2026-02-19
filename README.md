# Setvi RFQ API Tests

Automated API test suite for the Setvi AI-powered RFQ (Request for Quote) module.
25 test cases covering 10 documented bugs across 2 API endpoints.

**Last verified:** 2026-02-19 -- all 25 tests verified against live API

## Quick Start

```bash
git clone <repo-url>
cd "Setvi-Task RFQ API Tests"
npm install
cp .env.example .env
# Edit .env and add your API key from the task documentation
npm test
```

## Open the HTML report after a test run:

```bash
npm run report
```

## Prerequisites

- Node.js 18+
- npm
- API key (provided in the task documentation PDF)

## Configuration

1. Copy the example environment file:
   ```bash
   cp .env.example .env
   ```
2. Open `.env` and replace `your-api-key-here` with the API key from the task documentation.

## Scripts

| Command                 | Description                       |
| ----------------------- | --------------------------------- |
| `npm test`              | Run all 25 tests                  |
| `npm run test:negative` | Run negative tests only (A01-A13) |
| `npm run test:positive` | Run positive tests only (B01-B12) |
| `npm run report`        | Open HTML report in browser       |

## Test Structure

```
tests/
  helpers/
    api-constants.ts          # Endpoints, test data, types
  negative/
    input-validation.spec.ts  # A01-A06 (Bugs N1, N2)
    parameter-behavior.spec.ts # A07-A12 (Bugs N3, N4)
    character-handling.spec.ts # A13 (Bug N5)
  positive/
    functional-accuracy.spec.ts    # B01-B06 (Bugs P1, P2, P3)
    determinism.spec.ts            # B07-B08 (Bug P4)
    response-completeness.spec.ts  # B09-B12 (Bug P5)
```

## Test Results Interpretation

Tests verify **expected (correct) behavior** from bug reports. No `test.fail()` is used.

| Result | Meaning                                                  |
| ------ | -------------------------------------------------------- |
| Pass   | Bug is FIXED -- API behaves as expected                  |
| Fail   | Bug STILL EXISTS -- API does not match expected behavior |

All tests use the actual API response structure (`body.result.matchedItems[0]?.matchedInternalProducts`).

### Expected Results After Live Verification (2026-02-19)

| Tests   | Expected | Bug Status                                       |
| ------- | -------- | ------------------------------------------------ |
| A01-A13 | Pass     | N1, N2, N3, N4, N5 FIXED                         |
| B01-B04 | Pass     | P1 PARTIALLY FIXED, P2 FIXED                     |
| B05-B06 | Fail     | P3 NOT FIXED (empty URL extraction)              |
| B07-B08 | Fail     | P4 NOT FIXED (different products for same input) |
| B09     | Fail     | P5 NOT FIXED (price missing)                     |
| B10-B12 | Pass     | P5 FIXED (sku, vendor, stock, images present)    |

## Coverage

| Bug | Title                                 | Severity | Priority | Tests              | Category              |
| --- | ------------------------------------- | -------- | -------- | ------------------ | --------------------- |
| N1  | Empty Text Returns 200 Instead of 400 | Medium   | High     | A01, A02, A03      | Input Validation      |
| N2  | Invalid URL Causes Server Error 500   | High     | High     | A04, A05, A06      | Input Validation      |
| N3  | Threshold Parameter Ignored           | High     | Medium   | A07, A08, A09      | Parameter Behavior    |
| N4  | topK Always Returns 5                 | Medium   | Medium   | A10, A11, A12      | Parameter Behavior    |
| N5  | Special Characters Break Matching     | Low      | Low      | A13                | Character Handling    |
| P1  | Private Label Flag No Effect          | Medium   | Medium   | B01, B02           | Functional Accuracy   |
| P2  | High Score for Wrong Product          | High     | High     | B03, B04           | Functional Accuracy   |
| P3  | URL Extracts Wrong Content            | High     | High     | B05, B06           | URL Extraction        |
| P4  | Similarity Score Inconsistent         | Medium   | Medium   | B07, B08           | Determinism           |
| P5  | Missing Product Fields                | Low      | Low      | B09, B10, B11, B12 | Response Completeness |

## Open Ambiguities

1. **B02**: No metadata to identify private label products in API response
2. ~~**B05, B06**: Product page URL needed~~
   **RESOLVED**: using Amazon `https://www.amazon.com/dp/B0BVZLHNMB` (kitchen knife, reproduces P3 bug)
3. **B07, B08**: Bug report describes score variance (±0.07), but live testing (2026-02-19) shows product variance instead (different product returned for same input, scores stable at 99). Tolerance (±1 / ±2) is informal -- no official spec
4. **B09-B12**: Expected fields (price, sku, vendor, inStock, imageUrl) based on bug report, not formal API schema. Live API uses different names: `unitPrice` (empty), `sku`, `vendor.name`, `isStockProduct`, `images[].path`. Only `price` is truly missing
