// Setvi RFQ API -- Test constants and types

export const ENDPOINTS = {
  FREE_TEXT: '/api/rfq/upload-free-text',
  URL_HTML: '/api/rfq/upload-url-html',
};

export const DEFAULTS = {
  topK: 3,
  threshold: 0.5,
  enablePrivateLabelRanking: false,
};

export const QUERIES = {
  CUTTING_BOARD: 'Cutting Board',
  CUTTING_BOARD_SPECIFIC: 'Plastic Cutting Board 24x18',
  CONTAINER: 'container',
  GREEN_BOARD: 'Green Polyethylene Board',
  SPOON_BULK: 'Industrial Plastic Spoon Bulk 100 pack',
  CAFE_CLEAN: 'Cafe & Restaurant Supplies',
  CAFE_ACCENT: 'Caf\u00e9 & Restaurant Supplies',
  QUOTES_MEASUREMENT: '24" x 18" cutting board',
  KITCHEN_KNIFE: 'kitchen knife',
};

// Resolved Ambiguity #2: Amazon kitchen knife product page -- reproduces Bug P3
// API extracts empty content from this JS-rendered page (2026-02-17: wrong matches, 2026-02-19: 0 matches)
export const PRODUCT_PAGE_URL = 'https://www.amazon.com/dp/B0BVZLHNMB';

export const TOLERANCE = {
  SHORT_RUN: 1, // B07: 3 attempts -- ±1 on 0-100 percentage scale (bug report: ±0.01 on 0-1 scale)
  LONG_RUN: 2,  // B08: 5 attempts -- ±2 on 0-100 percentage scale (bug report: ±0.02 on 0-1 scale)
};
