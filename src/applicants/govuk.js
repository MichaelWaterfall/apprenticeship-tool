const { chromium } = require("playwright");

async function openApplication(vacancyUrl) {
  const browser = await chromium.launch({
    headless: false,
  });

  const page = await browser.newPage();

  console.log("Opening vacancy...");

  await page.goto(vacancyUrl, {
    waitUntil: "domcontentloaded",
  });

  console.log(`Opened: ${await page.title()}`);

  // Keep browser open while we're developing.
  console.log("Browser will remain open for 5 minutes.");

  await page.waitForTimeout(300000);

  await browser.close();
}

const vacancyUrl = process.argv[2];

if (!vacancyUrl) {
  console.error(
    "Please provide a Find an Apprenticeship vacancy URL."
  );

  process.exit(1);
}

openApplication(vacancyUrl).catch((error) => {
  console.error("Application automation failed:");
  console.error(error);
});