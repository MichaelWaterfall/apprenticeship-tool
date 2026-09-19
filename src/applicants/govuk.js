const { chromium } = require("playwright");
const fs = require("fs");

const AUTH_FILE = "playwright/.auth/govuk.json";

function waitForEnter() {
  return new Promise((resolve) => {
    process.stdin.once("data", resolve);
  });
}

function getApplicationControl(page) {
  return page
    .getByText(
      /^(apply for apprenticeship|continue application|continue your application)$/i
    )
    .first();
}

// ---------------------------------------
// INSPECT ONE WRITTEN QUESTION PAGE
// ---------------------------------------

async function inspectQuestionPage(page, number) {
  console.log("\n");
  console.log("##################################################");
  console.log(`QUESTION ${number}`);
  console.log("##################################################");

  console.log(`PAGE TITLE: ${await page.title()}`);
  console.log(`PAGE URL:   ${page.url()}`);

  // ---------------------------------------
  // HEADINGS
  // ---------------------------------------

  console.log("\nHEADINGS:");

  const headings = page.locator("h1, h2, h3");
  const headingCount = await headings.count();

  for (let i = 0; i < headingCount; i++) {
    const heading = headings.nth(i);

    const text = (
      await heading.innerText().catch(() => "")
    )
      .replace(/\s+/g, " ")
      .trim();

    if (text) {
      console.log(`  ${i + 1}. "${text}"`);
    }
  }

  // ---------------------------------------
  // LABELS
  // ---------------------------------------

  console.log("\nLABELS:");

  const labels = page.locator("label");
  const labelCount = await labels.count();

  console.log(`Found ${labelCount}`);

  for (let i = 0; i < labelCount; i++) {
    const label = labels.nth(i);

    const text = (
      await label.innerText().catch(() => "")
    )
      .replace(/\s+/g, " ")
      .trim();

    const forAttribute =
      await label.getAttribute("for");

    console.log(
      `  ${i + 1}. "${text}" for="${forAttribute || ""}"`
    );
  }

  // ---------------------------------------
  // TEXTAREAS
  // ---------------------------------------

  console.log("\nTEXTAREAS:");

  const textareas = page.locator("textarea");
  const textareaCount = await textareas.count();

  console.log(`Found ${textareaCount}`);

  for (let i = 0; i < textareaCount; i++) {
    const textarea = textareas.nth(i);

    const id =
      (await textarea.getAttribute("id")) || "";

    const name =
      (await textarea.getAttribute("name")) || "";

    const maxlength =
      (await textarea.getAttribute("maxlength")) || "";

    const ariaDescribedBy =
      (await textarea.getAttribute("aria-describedby")) || "";

    const existingValue =
      await textarea.inputValue();

    console.log(`\n  TEXTAREA ${i + 1}`);

    console.log(`    id="${id}"`);
    console.log(`    name="${name}"`);
    console.log(`    maxlength="${maxlength}"`);

    console.log(
      `    aria-describedby="${ariaDescribedBy}"`
    );

    console.log(
      `    existing answer length=${existingValue.length}`
    );

    if (existingValue.length > 0) {
      console.log(
        `    existing answer="${existingValue}"`
      );
    } else {
      console.log(
        "    existing answer=(empty)"
      );
    }
  }

  // ---------------------------------------
  // HINTS / CHARACTER COUNTERS
  // ---------------------------------------

  console.log("\nHINTS / CHARACTER INFORMATION:");

  const possibleHints = page.locator(
    [
      ".govuk-hint",
      ".govuk-character-count__message",
      "[id*='hint']",
      "[id*='info']",
    ].join(", ")
  );

  const hintCount =
    await possibleHints.count();

  console.log(`Found ${hintCount}`);

  for (let i = 0; i < hintCount; i++) {
    const hint = possibleHints.nth(i);

    const text = (
      await hint.innerText().catch(() => "")
    )
      .replace(/\s+/g, " ")
      .trim();

    if (text) {
      console.log(`  "${text}"`);
    }
  }

  // ---------------------------------------
  // BUTTONS
  // ---------------------------------------

  console.log("\nBUTTONS:");

  const buttons = page.getByRole("button");
  const buttonCount = await buttons.count();

  console.log(`Found ${buttonCount}`);

  for (let i = 0; i < buttonCount; i++) {
    const button = buttons.nth(i);

    const text = (
      await button.innerText().catch(() => "")
    )
      .replace(/\s+/g, " ")
      .trim();

    console.log(`  ${i + 1}. "${text}"`);
  }

  // ---------------------------------------
  // COMPLETION RADIOS
  // ---------------------------------------

  console.log("\nRADIO BUTTONS:");

  const radios = page.locator(
    'input[type="radio"]'
  );

  const radioCount = await radios.count();

  console.log(`Found ${radioCount}`);

  for (let i = 0; i < radioCount; i++) {
    const radio = radios.nth(i);

    console.log(`  RADIO ${i + 1}`);

    console.log(
      `    id="${(await radio.getAttribute("id")) || ""}"`
    );

    console.log(
      `    name="${(await radio.getAttribute("name")) || ""}"`
    );

    console.log(
      `    value="${(await radio.getAttribute("value")) || ""}"`
    );

    console.log(
      `    checked=${await radio.isChecked()}`
    );
  }

  console.log(
    "\n*** Nothing has been changed on this question. ***"
  );
}

// ---------------------------------------
// MAIN
// ---------------------------------------

async function inspectQuestions(vacancyUrl) {
  if (!fs.existsSync(AUTH_FILE)) {
    console.error(
      "No saved login session found."
    );

    console.error(
      `Expected: ${AUTH_FILE}`
    );

    process.exit(1);
  }

  const browser = await chromium.launch({
    headless: false,
  });

  const context = await browser.newContext({
    storageState: AUTH_FILE,
  });

  const page = await context.newPage();

  // ---------------------------------------
  // OPEN VACANCY
  // ---------------------------------------

  console.log("Opening vacancy...");

  await page.goto(vacancyUrl, {
    waitUntil: "domcontentloaded",
  });

  let applicationControl =
    getApplicationControl(page);

  try {
    await applicationControl.waitFor({
      state: "visible",
      timeout: 5000,
    });
  } catch {
    console.log("\nSign in manually if required.");

    console.log(
      "Complete phone verification if requested."
    );

    console.log(
      "When you are back on the vacancy page, press ENTER."
    );

    await waitForEnter();

    await context.storageState({
      path: AUTH_FILE,
    });

    await page.goto(vacancyUrl, {
      waitUntil: "domcontentloaded",
    });

    applicationControl =
      getApplicationControl(page);

    await applicationControl.waitFor({
      state: "visible",
      timeout: 15000,
    });
  }

  // ---------------------------------------
  // OPEN APPLICATION
  // ---------------------------------------

  console.log("\nOpening application...");

  await applicationControl.click();

  await page.waitForTimeout(1000);

  const overviewUrl = page.url();

  console.log(
    `Application overview: ${overviewUrl}`
  );

  // ---------------------------------------
  // FIND TAILORED QUESTION LINKS
  // ---------------------------------------

  const questionLinks = page.locator(
    [
      'a[href*="/skillsandstrengths"]',
      'a[href*="/what-interests-you"]',
      'a[href*="/additional-question/"]',
    ].join(", ")
  );

  const questionCount =
    await questionLinks.count();

  console.log("\n========================================");
  console.log("TAILORED QUESTIONS FOUND");
  console.log("========================================");

  console.log(
    `\nFound ${questionCount} question link(s).\n`
  );

  // Save the links before navigating away.
  const questions = [];

  for (let i = 0; i < questionCount; i++) {
    const link = questionLinks.nth(i);

    const text = (
      await link.innerText()
    )
      .replace(/\s+/g, " ")
      .trim();

    const href =
      await link.getAttribute("href");

    questions.push({
      text,
      href,
    });

    console.log(`${i + 1}. ${text}`);
    console.log(`   ${href}`);
  }

  // ---------------------------------------
  // INSPECT EACH QUESTION
  // ---------------------------------------

  for (let i = 0; i < questions.length; i++) {
    const question = questions[i];

    console.log("\n\n========================================");
    console.log(`OPENING QUESTION ${i + 1}`);
    console.log("========================================");

    console.log(
      `Overview link text: "${question.text}"`
    );

    if (!question.href) {
      console.log(
        "No href found - skipping."
      );

      continue;
    }

    const absoluteUrl = new URL(
      question.href,
      overviewUrl
    ).toString();

    await page.goto(absoluteUrl, {
      waitUntil: "domcontentloaded",
    });

    await inspectQuestionPage(
      page,
      i + 1
    );
  }

  // ---------------------------------------
  // RETURN TO OVERVIEW
  // ---------------------------------------

  await page.goto(overviewUrl, {
    waitUntil: "domcontentloaded",
  });

  // ---------------------------------------
  // SAVE SESSION
  // ---------------------------------------

  await context.storageState({
    path: AUTH_FILE,
  });

  console.log("\n\n========================================");
  console.log("QUESTION INSPECTION COMPLETE");
  console.log("========================================");

  console.log(
    "\nNo written answers were changed."
  );

  console.log(
    "The application was NOT submitted."
  );

  console.log(
    "\nBrowser will remain open for 5 minutes."
  );

  await page.waitForTimeout(300000);

  await context.storageState({
    path: AUTH_FILE,
  });

  await browser.close();
}

// ---------------------------------------
// VACANCY URL
// ---------------------------------------

const vacancyUrl = process.argv[2];

if (!vacancyUrl) {
  console.error(
    'Usage: node src/applicants/govuk.js "VACANCY_URL"'
  );

  process.exit(1);
}

inspectQuestions(vacancyUrl).catch(
  (error) => {
    console.error(
      "\nQuestion inspection failed:"
    );

    console.error(error);
  }
);