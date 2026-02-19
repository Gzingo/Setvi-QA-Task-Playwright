import { test, expect } from "@playwright/test";
import { ENDPOINTS, QUERIES } from "../helpers/api-constants";

test.describe("RFQ Character Handling (A13)", () => {
  test("A13: Special characters do not break product matching [Bug N5]", async ({
    request,
  }) => {
    // Clean text without special characters
    const baseline = await request.post(ENDPOINTS.FREE_TEXT, {
      data: { text: QUERIES.CAFE_CLEAN, topK: 3, threshold: 0.3 },
    });
    expect(baseline.status()).toBe(200);
    const baselineBody = await baseline.json();
    const baselineProducts =
      baselineBody.result.matchedItems[0]?.matchedInternalProducts ?? [];
    // Text with accent (é)
    const withAccent = await request.post(ENDPOINTS.FREE_TEXT, {
      data: { text: QUERIES.CAFE_ACCENT, topK: 3, threshold: 0.3 },
    });
    expect(withAccent.status()).toBe(200);
    const accentBody = await withAccent.json();
    const accentProducts =
      accentBody.result.matchedItems[0]?.matchedInternalProducts ?? [];
    // Both requests must return results (Bug N5 expected: should not be empty)
    expect(baselineProducts.length).toBeGreaterThan(0);
    expect(accentProducts.length).toBeGreaterThan(0);
    // Text with quote characters in measurements
    const withQuotes = await request.post(ENDPOINTS.FREE_TEXT, {
      data: { text: QUERIES.QUOTES_MEASUREMENT, topK: 3, threshold: 0.3 },
    });
    expect(withQuotes.status()).toBe(200);
    const quotesBody = await withQuotes.json();
    const quotesProducts =
      quotesBody.result.matchedItems[0]?.matchedInternalProducts ?? [];
    expect(quotesProducts.length).toBeGreaterThan(0);
  });
});
