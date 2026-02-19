import { test, expect } from "@playwright/test";
import {
  ENDPOINTS,
  DEFAULTS,
  QUERIES,
  TOLERANCE,
} from "../helpers/api-constants";

test.describe("RFQ Determinism / Consistency (B07-B08)", () => {
  /* Bug P4: non-deterministic results for identical input.
     Bug report: same query returns different scores (0.78, 0.82, 0.75 = ±0.07 variance).
     Live (2026-02-19): scores are stable (all 99) but API returns DIFFERENT PRODUCTS
     for the same input (9x12 board vs 15x20 board). Both are non-determinism.
     API uses percentage (0-100), not similarityScore (0-1) from bug report.
     Tolerance is informal -- see README Open Ambiguities #3.
     Bug P4 NOT fixed. Test correctly FAILS. */
  test("B07: Same input produces consistent scores -- 3 attempts [Bug P4]", async ({
    request,
  }) => {
    const scores: number[] = [];
    const names: string[] = [];
    for (let i = 0; i < 3; i++) {
      const response = await request.post(ENDPOINTS.FREE_TEXT, {
        data: {
          text: QUERIES.GREEN_BOARD,
          topK: 1,
          threshold: DEFAULTS.threshold,
        },
      });
      expect(response.status()).toBe(200);
      const body = await response.json();
      const products =
        body.result.matchedItems[0]?.matchedInternalProducts ?? [];
      expect(products.length).toBeGreaterThan(0);
      scores.push(products[0].percentage);
      names.push(products[0].name);
    }
    // Same product every time
    expect(names[0]).toBe(names[1]);
    expect(names[1]).toBe(names[2]);
    // Score variance within tolerance (±1 on 0-100 scale)
    const maxScore = Math.max(...scores);
    const minScore = Math.min(...scores);
    expect(maxScore - minScore).toBeLessThanOrEqual(TOLERANCE.SHORT_RUN);
  });

  /* Bug P4 extended: 5 requests to increase chance of detecting variance.
     Same issue as B07 -- product and/or score may vary between requests.
     Tolerance is ±2 (informal, see README Open Ambiguities #3).
     Bug P4 NOT fixed. Test correctly FAILS. */
  test("B08: Score variance within bounds over 5 requests [Bug P4 extended]", async ({
    request,
  }) => {
    const scores: number[] = [];
    const names: string[] = [];
    for (let i = 0; i < 5; i++) {
      const response = await request.post(ENDPOINTS.FREE_TEXT, {
        data: {
          text: QUERIES.GREEN_BOARD,
          topK: 1,
          threshold: DEFAULTS.threshold,
        },
      });
      expect(response.status()).toBe(200);
      const body = await response.json();
      const products =
        body.result.matchedItems[0]?.matchedInternalProducts ?? [];
      expect(products.length).toBeGreaterThan(0);
      scores.push(products[0].percentage);
      names.push(products[0].name);
    }
    // Same product all 5 times
    for (let i = 1; i < names.length; i++) {
      expect(names[i]).toBe(names[0]);
    }
    // Score variance within tolerance (±2 on 0-100 scale)
    const maxScore = Math.max(...scores);
    const minScore = Math.min(...scores);
    expect(maxScore - minScore).toBeLessThanOrEqual(TOLERANCE.LONG_RUN);
  });
});
