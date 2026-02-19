import { test, expect } from "@playwright/test";
import { ENDPOINTS, DEFAULTS } from "../helpers/api-constants";

test.describe("RFQ Input Validation (A01-A06)", () => {
  // Free-Text Endpoint: Empty
  test("A01: Empty text returns 400 instead of 200 [Bug N1]", async ({
    request,
  }) => {
    const response = await request.post(ENDPOINTS.FREE_TEXT, {
      data: {
        text: "",
        topK: DEFAULTS.topK,
        threshold: DEFAULTS.threshold,
        enablePrivateLabelRanking: DEFAULTS.enablePrivateLabelRanking,
      },
    });
    expect(response.status()).toBe(400);
    const body = await response.json();
    expect(body).toHaveProperty("error_code");
    expect(body).not.toHaveProperty("matchedProducts");
  });

  // Free-Text Endpoint: Whitespace
  test("A02: Whitespace-only text returns 400 [Bug N1 variant]", async ({
    request,
  }) => {
    const response = await request.post(ENDPOINTS.FREE_TEXT, {
      data: {
        text: "   \t\n",
        topK: DEFAULTS.topK,
        threshold: DEFAULTS.threshold,
        enablePrivateLabelRanking: false,
      },
    });
    expect(response.status()).toBe(400);
    const body = await response.json();
    expect(body).toHaveProperty("error_code");
    expect(body).not.toHaveProperty("matchedProducts");
  });

  // Free-Text Endpoint: Missing
  test("A03: Missing text field returns 400 [Bug N1 variant]", async ({
    request,
  }) => {
    const response = await request.post(ENDPOINTS.FREE_TEXT, {
      data: {
        // "text" field intentionally omitted
        topK: DEFAULTS.topK,
        threshold: DEFAULTS.threshold,
        enablePrivateLabelRanking: false,
      },
    });
    expect(response.status()).toBe(400);
    const body = await response.json();
    expect(body).toHaveProperty("errors");
    expect(body).not.toHaveProperty("matchedProducts");
  });

  // URL Endpoint: Invalid
  test("A04: Invalid URL format returns 400, not 500 [Bug N2]", async ({
    request,
  }) => {
    test.setTimeout(120000);
    const response = await request.post(ENDPOINTS.URL_HTML, {
      data: {
        url: "not-a-valid-url-format",
        topK: DEFAULTS.topK,
        threshold: DEFAULTS.threshold,
      },
    });
    expect(response.status()).toBe(400);
    expect(response.status()).not.toBe(500);
    const body = await response.json();
    expect(body).toHaveProperty("error_code");
    expect(body).not.toHaveProperty("traceId");
    expect(body).not.toHaveProperty("matchedProducts");
  });

  // URL Endpoint: Unreachable
  test("A05: Unreachable URL returns 4xx, not 500 [Bug N2 variant]", async ({
    request,
  }) => {
    test.setTimeout(180000);
    const response = await request.post(ENDPOINTS.URL_HTML, {
      data: {
        url: "https://this-domain-does-not-exist-xyz123.com/product",
        topK: DEFAULTS.topK,
        threshold: DEFAULTS.threshold,
      },
    });
    expect([400, 421, 422]).toContain(response.status());
    const body = await response.json();
    expect(body).toHaveProperty("error_code");
    expect(body).not.toHaveProperty("traceId");
  });

  // URL Endpoint: Empty
  test("A06: Empty URL returns 400 [Bug N2 variant]", async ({ request }) => {
    const response = await request.post(ENDPOINTS.URL_HTML, {
      data: {
        url: "",
        topK: DEFAULTS.topK,
        threshold: DEFAULTS.threshold,
      },
    });
    expect(response.status()).toBe(400);
    const body = await response.json();
    expect(body).toHaveProperty("error_code");
    expect(body).not.toHaveProperty("matchedProducts");
  });
});
