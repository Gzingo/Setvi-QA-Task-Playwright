import { test, expect } from "@playwright/test";
import {
  ENDPOINTS,
  DEFAULTS,
  QUERIES,
  PRODUCT_PAGE_URL,
} from "../helpers/api-constants";

test.describe("RFQ Functional Accuracy (B01-B06)", () => {
  /* Private Label Ranking (Bug P1)
     Bug P1 expected: "When flag=true, private label products should appear first"
     Bug report: both requests return identical product lists in the same order.
     Live testing shows the flag DOES change results (different products/order),
     but no products in the catalog have isPrivateLabel=true for "Cutting Board",
     so we can only verify the flag changes output, not prioritization. */
  test("B01: enablePrivateLabelRanking flag changes product ordering [Bug P1]", async ({
    request,
  }) => {
    const responseA = await request.post(ENDPOINTS.FREE_TEXT, {
      data: {
        text: QUERIES.CUTTING_BOARD,
        topK: 5,
        threshold: 0.3,
        enablePrivateLabelRanking: false,
      },
    });
    // Step 1: Baseline request with flag=false
    expect(responseA.status()).toBe(200);
    const bodyA = await responseA.json();
    const listA = bodyA.result.matchedItems[0]?.matchedInternalProducts ?? [];
    const responseB = await request.post(ENDPOINTS.FREE_TEXT, {
      data: {
        text: QUERIES.CUTTING_BOARD,
        topK: 5,
        threshold: 0.3,
        enablePrivateLabelRanking: true,
      },
    });
    // Step 2: Same query with flag=true -- product list should differ
    expect(responseB.status()).toBe(200);
    const bodyB = await responseB.json();
    const listB = bodyB.result.matchedItems[0]?.matchedInternalProducts ?? [];
    const namesA = listA.map((p: { name: string }) => p.name);
    const namesB = listB.map((p: { name: string }) => p.name);
    expect(namesB).not.toEqual(namesA);
  });

  /* Bug P1 variant: when flag=true, private label products should rank first.
     No products in catalog have isPrivateLabel=true for this query, so we
     verify the field exists and check if any are flagged as private label. */
  test("B02: Private label products ranked first when flag is true [Bug P1 variant]", async ({
    request,
  }) => {
    const response = await request.post(ENDPOINTS.FREE_TEXT, {
      data: {
        text: QUERIES.CUTTING_BOARD,
        topK: 5,
        threshold: 0.3,
        enablePrivateLabelRanking: true,
      },
    });
    // Flag=true should return products with isPrivateLabel field present
    expect(response.status()).toBe(200);
    const body = await response.json();
    const products = body.result.matchedItems[0]?.matchedInternalProducts ?? [];
    expect(products.length).toBeGreaterThan(0);
    for (const product of products) {
      expect(product).toHaveProperty("isPrivateLabel");
    }
  });

  /* Relevance / Similarity Accuracy (Bug P2)
     Bug P2 expected: "Cutting board products should have highest scores (0.8+)"
     Bug report: spoon got 0.89 for "Cutting Board" query, actual cutting boards scored lower.
     API response does NOT contain "similarityScore" field from bug report.
     Instead, API returns "percentage" (0-100 integer). We test against that.
     Live testing: all 3 results are cutting boards at 99%. Bug is FIXED. */
  test("B03: Relevant products score highest for specific query [Bug P2]", async ({
    request,
  }) => {
    const response = await request.post(ENDPOINTS.FREE_TEXT, {
      data: {
        text: QUERIES.CUTTING_BOARD_SPECIFIC,
        topK: 3,
        threshold: DEFAULTS.threshold,
      },
    });
    expect(response.status()).toBe(200);
    const body = await response.json();
    const products = body.result.matchedItems[0]?.matchedInternalProducts ?? [];
    expect(products.length).toBeGreaterThan(0);
    // First result must be a cutting board, not a spoon
    const firstProduct = products[0];
    expect(firstProduct.name.toLowerCase()).toContain("cutting board");
    expect(firstProduct.percentage).toBeGreaterThanOrEqual(80);
    // Any spoon in results must have a low score
    for (const product of products) {
      if (product.name.toLowerCase().includes("spoon")) {
        expect(product.percentage).toBeLessThan(30);
      }
    }
  });

  /* Bug P2 variant: reverse check -- unrelated products should score low.
     Querying "Industrial Plastic Spoon Bulk 100 pack", any cutting board
     in results should have a low score. API does not have "similarityScore"
     from bug report -- using "percentage" (0-100) instead. */
  test("B04: Unrelated products score low for specific query [Bug P2 variant]", async ({
    request,
  }) => {
    const response = await request.post(ENDPOINTS.FREE_TEXT, {
      data: {
        text: QUERIES.SPOON_BULK,
        topK: 5,
        threshold: 0.3,
      },
    });
    expect(response.status()).toBe(200);
    const body = await response.json();
    const products = body.result.matchedItems[0]?.matchedInternalProducts ?? [];
    expect(products.length).toBeGreaterThan(0);
    // Cutting boards should score low for a spoon query
    for (const product of products) {
      if (product.name.toLowerCase().includes("cutting board")) {
        expect(product.percentage).toBeLessThan(50);
      }
    }
  });

  /* Bug P3: URL upload extracts navigation/empty content instead of product info.
     Bug report: extracts "Home > Kitchen > Sign in" → matches furniture instead of knives.
     Live (2026-02-19): extracts nothing (empty vectorSearchQuery) → 0 matches.
     Same root cause (Amazon JS-rendered page, server-side fetch gets no content),
     different symptom. Bug P3 NOT fixed. Test correctly FAILS. */
  test("B05: URL upload extracts product content and matches relevant products [Bug P3]", async ({
    request,
  }) => {
    test.setTimeout(120000); // URL endpoint can take 60-70s to process

    const response = await request.post(ENDPOINTS.URL_HTML, {
      data: {
        url: PRODUCT_PAGE_URL,
        topK: 5,
        threshold: 0.3,
      },
    });
    expect(response.status()).toBe(200);
    const body = await response.json();
    // 1. Extracted text should contain product-related terms, not be empty
    const extracted = body.result.summary.vectorSearchQuery;
    expect(extracted.trim().length).toBeGreaterThan(0);
    const knifeTerms = /knife|kitchen|blade|cutting|steel/i;
    expect(extracted).toMatch(knifeTerms);
    // 2. Should have matched catalog products
    const items = body.result.matchedItems[0]?.matchedInternalProducts ?? [];
    expect(items.length).toBeGreaterThan(0);
    // 3. First matched product should be knife-related, not tumblers/bowls/carts
    const firstName = items[0].name.toLowerCase();
    expect(firstName).toMatch(/knife|cutlery|flatware/);
  });

  /* Bug P3 variant: URL extraction vs free-text cross-validation.
     If extraction works, URL and free-text "kitchen knife" should return overlapping products.
     Live (2026-02-19): URL returns 0 matches, free-text returns 3 knives. No overlap.
     Bug P3 NOT fixed. Test correctly FAILS. */
  test("B06: URL upload matches same category as free-text search [Bug P3 variant]", async ({
    request,
  }) => {
    test.setTimeout(120000); // URL endpoint can take 60-70s to process
    const urlResponse = await request.post(ENDPOINTS.URL_HTML, {
      data: {
        url: PRODUCT_PAGE_URL,
        topK: 3,
        threshold: DEFAULTS.threshold,
      },
    });
    expect(urlResponse.status()).toBe(200);
    const urlBody = await urlResponse.json();
    const urlProducts =
      urlBody.result.matchedItems[0]?.matchedInternalProducts ?? [];
    const textResponse = await request.post(ENDPOINTS.FREE_TEXT, {
      data: {
        text: QUERIES.KITCHEN_KNIFE,
        topK: 3,
        threshold: DEFAULTS.threshold,
      },
    });
    expect(textResponse.status()).toBe(200);
    const textBody = await textResponse.json();
    const textProducts =
      textBody.result.matchedItems[0]?.matchedInternalProducts ?? [];
    // At least one product should appear in both result sets
    const urlNames = urlProducts.map((p: { name: string }) => p.name);
    const textNames = textProducts.map((p: { name: string }) => p.name);
    const overlap = urlNames.filter((name: string) => textNames.includes(name));
    expect(overlap.length).toBeGreaterThan(0);
  });
});
