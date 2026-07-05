// Test environment: WASM sqlite (synchronized schema), no external services.
process.env.DB_DRIVER = "sqljs";
process.env.DISABLE_REDIS = "true"; // cache no-ops, rate limit allows, inline processing
process.env.JWT_SECRET = "test-secret";
process.env.MATCH_HIGH = "0.9";
process.env.MATCH_LOW = "0.6";
