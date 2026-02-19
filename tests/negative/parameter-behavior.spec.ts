import { test, expect } from "@playwright/test";
import { ENDPOINTS, DEFAULTS, QUERIES } from "../helpers/api-constants";

test.describe("RFQ Parameter Behavior (A07-A12)", () => {
  /* Threshold Parameter (Bug N3)
      Bug N3 expected: "Only return products with similarityScore >= 0.8"
       Bug report also states "Array length should be <= 2" but that was based on
       original scores (0.85, 0.72, 0.61, 0.45, 0.38). Current API returns all
       products at 99% for "Cutting Board", so 5 results is correct and all pass
       the 0.8 threshold. We only assert score >= 80, not array length. */
  test("A07: Threshold 0.8 returns only products above 80% [Bug N3]", async ({
    request,
  }) => {
    const response = await request.post(ENDPOINTS.FREE_TEXT, {
      data: {
        text: QUERIES.CUTTING_BOARD,
        topK: 5,
        threshold: 0.8,
        enablePrivateLabelRanking: false,
      },
    });
    expect(response.status()).toBe(200);
    const body = await response.json();
    const products = body.result.matchedItems[0]?.matchedInternalProducts ?? [];
    expect(products.length).toBeGreaterThan(0);
    for (const product of products) {
      expect(product.percentage).toBeGreaterThanOrEqual(80);
    }
  });

  /* Bug N3 boundary: threshold=0.99 is the strictest useful filter.
     All returned products must have percentage >= 99. With "Cutting Board"
     all products score 99%, so this alone cannot prove threshold filtering
     works, but it confirms no sub-99% products leak through. */
  test("A08: Threshold 0.99 filters out products below 99% [Bug N3 boundary]", async ({
    request,
  }) => {
    const response = await request.post(ENDPOINTS.FREE_TEXT, {
      data: {
        text: QUERIES.CUTTING_BOARD,
        topK: 5,
        threshold: 0.99,
        enablePrivateLabelRanking: false,
      },
    });

    expect(response.status()).toBe(200);
    const body = await response.json();
    const products = body.result.matchedItems[0]?.matchedInternalProducts ?? [];
    for (const product of products) {
      expect(product.percentage).toBeGreaterThanOrEqual(99);
    }
  });

  /* Bug N3 boundary: threshold=0.0 means no filtering
     All products should be returned regardless of score. With topK=10, API returns 10
     products. Verifies the lowest threshold does not block any results. */
  test("A09: Threshold 0.0 returns all matches (no filtering) [Bug N3 boundary]", async ({
    request,
  }) => {
    const response = await request.post(ENDPOINTS.FREE_TEXT, {
      data: {
        text: QUERIES.CUTTING_BOARD,
        topK: 10,
        threshold: 0.0,
        enablePrivateLabelRanking: false,
      },
    });
    expect(response.status()).toBe(200);
    const body = await response.json();
    const products = body.result.matchedItems[0]?.matchedInternalProducts ?? [];
    expect(products.length).toBeGreaterThan(0);
    for (const product of products) {
      expect(product.percentage).toBeGreaterThanOrEqual(0);
    }
  });

  /* topK Parameter (Bug N4)
     Bug N4 expected: "topK=1 returns 1 product, topK=10 returns up to 10 products"
     Bug report: topK was ignored, always returned exactly 5 results. */
  test("A10: topK=1 returns exactly 1 result [Bug N4]", async ({ request }) => {
    const response = await request.post(ENDPOINTS.FREE_TEXT, {
      data: {
        text: QUERIES.CONTAINER,
        topK: 1,
        threshold: DEFAULTS.threshold,
      },
    });
    expect(response.status()).toBe(200);
    const body = await response.json();
    const products = body.result.matchedItems[0]?.matchedInternalProducts ?? [];
    expect(products).toHaveLength(1);
  });

  /* Bug N4 variant: topK=10 should return up to 10 results (or all available if < 10).
     Bug report: always returned 5 regardless of topK value. */
  test("A11: topK=10 returns up to 10 results [Bug N4 variant]", async ({
    request,
  }) => {
    const response = await request.post(ENDPOINTS.FREE_TEXT, {
      data: {
        text: QUERIES.CONTAINER,
        topK: 10,
        threshold: DEFAULTS.threshold,
      },
    });
    expect(response.status()).toBe(200);
    const body = await response.json();
    const products = body.result.matchedItems[0]?.matchedInternalProducts ?? [];
    expect(products.length).toBeLessThanOrEqual(10);
    expect(products.length).toBeGreaterThan(1);
  });

  /* Bug N4 boundary: topK=0 is invalid. API returns 400 with error_code
     "BadRequest" and message about TopK range <1> to <100>. */
  test("A12: topK=0 returns 400 error [Bug N4 boundary]", async ({
    request,
  }) => {
    const response = await request.post(ENDPOINTS.FREE_TEXT, {
      data: {
        text: QUERIES.CONTAINER,
        topK: 0,
        threshold: DEFAULTS.threshold,
      },
    });
    expect(response.status()).toBe(400);
    const body = await response.json();
    expect(body).toHaveProperty("error_code");
  });
});
