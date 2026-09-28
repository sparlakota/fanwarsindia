/**
 * FanWarsIndia — public client config.
 * The anon key is meant to ship to every browser: it can only call the public_* database
 * functions and the create-order / order-status edge functions. The contributions table
 * (with phone numbers) is not readable with it — row-level security blocks it.
 */
const FW_CONFIG = (function () {
  const isProductionSite = ["www.fanwarsindia.com", "fanwarsindia.com"].includes(location.hostname);

  // LAUNCH SWITCH — set to true on go-live day (see GO-LIVE.md). Until then fanwarsindia.com shows
  // "payments open very soon" (the server also refuses test-mode payments from the live domain).
  // Preview links and localhost always allow (test-mode) payments.
  const paymentsOpenOnProduction = false;

  return {
    supabaseUrl: "https://cntrkcpwetjjifubccha.supabase.co",
    supabaseAnonKey:
      "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNudHJrY3B3ZXRqamlmdWJjY2hhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTAwNTE4NjAsImV4cCI6MjEwNTYyNzg2MH0.1ngeRwbUZxZrZ7fy8gCnAbNy4i2Sn_WbxjlK5gZCVj8",
    isProductionSite,
    paymentsOpen: !isProductionSite || paymentsOpenOnProduction,
    // Test-card payments are visible on preview/localhost for testing, never on the live site.
    showTestData: !isProductionSite,
  };
})();
