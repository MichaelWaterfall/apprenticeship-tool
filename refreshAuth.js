const { chromium } = require("playwright");
const fs = require("fs");

(async () => {
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();

  await page.goto("https://www.findapprenticeship.service.gov.uk/");

  console.log("Log into your apprenticeship account.");
  console.log("Navigate to your signed-in dashboard.");
  console.log("Then return here and press ENTER.");

  process.stdin.resume();
  await new Promise(resolve => process.stdin.once("data", resolve));

  const signedOut = await page
    .getByText(/^sign in or create an account$/i)
    .count();

  if (signedOut > 0) {
    console.log("Sign-in is still required. Session not saved.");
  } else {
    fs.mkdirSync("playwright/.auth", { recursive: true });
    await context.storageState({ path: "playwright/.auth/govuk.json" });
    console.log("Session saved.");
  }

  await browser.close();
})().catch(console.error);
