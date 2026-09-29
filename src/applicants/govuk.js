const { chromium } = require("playwright");
const fs = require("fs");

const {
  findVacancy,
} = require("../finder");

const {
  generateApplicationAnswers,
  printPreview,
} = require("../answerGenerator");

const AUTH_FILE =
  "playwright/.auth/govuk.json";

// ==================================================
// WAIT FOR ENTER
// ==================================================

function waitForEnter() {
  return new Promise((resolve) => {
    process.stdin.once("data", resolve);
  });
}

// ==================================================
// APPLICATION BUTTON
// ==================================================

function getApplicationControl(page) {
  return page
    .getByText(
      /^(apply for apprenticeship|continue application|continue your application)$/i
    )
    .first();
}

// ==================================================
// VACANCY REFERENCE
// ==================================================

function normaliseVacancyReference(reference) {
  if (!reference) {
    return "";
  }

  return String(reference)
    .trim()
    .replace(/^VAC/i, "");
}

function getVacancyReferenceFromUrl(vacancyUrl) {
  try {
    const url =
      new URL(vacancyUrl);

    const parts =
      url.pathname
        .split("/")
        .filter(Boolean);

    const referenceIndex =
      parts.findIndex(
        (part) =>
          part.toLowerCase() ===
          "reference"
      );

    if (
      referenceIndex !== -1 &&
      parts[referenceIndex + 1]
    ) {
      return normaliseVacancyReference(
        parts[referenceIndex + 1]
      );
    }

    const match =
      vacancyUrl.match(
        /(?:VAC)?(\d{6,})/i
      );

    if (match) {
      return normaliseVacancyReference(
        match[1]
      );
    }

    return "";
  } catch {
    return "";
  }
}

// ==================================================
// QUESTION TEXT
// ==================================================

async function getQuestionText(page) {
  const heading =
    page.locator("h1").first();

  if (await heading.count()) {
    const text = (
      await heading
        .innerText()
        .catch(() => "")
    )
      .replace(/\s+/g, " ")
      .trim();

    if (text) {
      return text;
    }
  }

  const textarea =
    page.locator("textarea").first();

  if (await textarea.count()) {
    const id =
      await textarea.getAttribute(
        "id"
      );

    if (id) {
      const label =
        page.locator(
          `label[for="${id}"]`
        );

      if (await label.count()) {
        const text = (
          await label
            .first()
            .innerText()
            .catch(() => "")
        )
          .replace(/\s+/g, " ")
          .trim();

        if (text) {
          return text;
        }
      }
    }
  }

  return "";
}

// ==================================================
// QUESTION LINKS
// ==================================================

async function getQuestionLinks(
  page,
  overviewUrl
) {
  const locator =
    page.locator(
      [
        'a[href*="/skillsandstrengths"]',
        'a[href*="/what-interests-you"]',
        'a[href*="/additional-question/"]',
      ].join(", ")
    );

  const count =
    await locator.count();

  const links = [];

  for (
    let i = 0;
    i < count;
    i++
  ) {
    const link =
      locator.nth(i);

    const href =
      await link.getAttribute(
        "href"
      );

    if (!href) {
      continue;
    }

    links.push({
      absoluteUrl:
        new URL(
          href,
          overviewUrl
        ).toString(),
    });
  }

  return links;
}

// ==================================================
// READ QUESTIONS
// ==================================================

async function readQuestions(
  page,
  questionLinks
) {
  const questions = [];

  console.log(
    "\n========================================"
  );

  console.log(
    "READING APPLICATION QUESTIONS"
  );

  console.log(
    "========================================\n"
  );

  for (
    let i = 0;
    i < questionLinks.length;
    i++
  ) {
    console.log(
      `Opening question ${i + 1}...`
    );

    await page.goto(
      questionLinks[i].absoluteUrl,
      {
        waitUntil:
          "domcontentloaded",
      }
    );

    const questionText =
      await getQuestionText(page);

    if (!questionText) {
      throw new Error(
        `Could not determine question ${i + 1}.`
      );
    }

    const textareaCount =
      await page
        .locator("textarea")
        .count();

    if (textareaCount === 0) {
      throw new Error(
        `Question ${i + 1} has no textarea. Stopping safely.`
      );
    }

    questions.push(
      questionText
    );

    console.log(
      `${i + 1}. ${questionText}`
    );
  }

  return questions;
}

// ==================================================
// SELECT "SECTION COMPLETE"
// ==================================================

async function markSectionComplete(page) {
  // We have observed both names on
  // Find an apprenticeship.
  const selectors = [
    'input[name="IsSectionComplete"][value="true"]',
    'input[name="IsSectionCompleted"][value="true"]',
  ];

  for (
    const selector of selectors
  ) {
    const radio =
      page.locator(selector);

    if (await radio.count()) {
      await radio.first().check();

      return;
    }
  }

  throw new Error(
    "Could not find the 'section complete' control."
  );
}

// ==================================================
// CONTINUE BUTTON
// ==================================================

async function clickContinue(page) {
  const button =
    page
      .getByRole(
        "button",
        {
          name: /^continue$/i,
        }
      )
      .first();

  if (
    !(await button.count())
  ) {
    throw new Error(
      "Could not find the Continue button."
    );
  }

  await button.click();

  await page.waitForLoadState(
    "domcontentloaded"
  );
}

// ==================================================
// FILL ONE QUESTION
// ==================================================

async function fillQuestion({
  page,
  questionLink,
  result,
}) {
  console.log(
    `\nQuestion ${result.questionNumber}: ${result.question}`
  );

  if (
    result.status !== "ready"
  ) {
    console.log(
      "MANUAL REVIEW — leaving this question unchanged."
    );

    console.log(
      `Reason: ${result.reviewReason}`
    );

    return false;
  }

  await page.goto(
    questionLink.absoluteUrl,
    {
      waitUntil:
        "domcontentloaded",
    }
  );

  // ----------------------------------------------
  // SAFETY CHECK:
  // Verify the page is still the question we expect.
  // ----------------------------------------------

  const liveQuestion =
    await getQuestionText(page);

  const expectedQuestion =
    result.question
      .replace(/\s+/g, " ")
      .trim();

  const actualQuestion =
    liveQuestion
      .replace(/\s+/g, " ")
      .trim();

  if (
    expectedQuestion !==
    actualQuestion
  ) {
    throw new Error(
      `Question mismatch. Expected "${expectedQuestion}" but page contains "${actualQuestion}".`
    );
  }

  // ----------------------------------------------
  // TEXTAREA
  // ----------------------------------------------

  const textareas =
    page.locator("textarea");

  const textareaCount =
    await textareas.count();

  if (
    textareaCount !== 1
  ) {
    throw new Error(
      `Expected exactly one textarea for question ${result.questionNumber}, but found ${textareaCount}.`
    );
  }

  const textarea =
    textareas.first();

  // ----------------------------------------------
  // FILL ANSWER
  // ----------------------------------------------

  await textarea.fill(
    result.answer
  );

  // Verify Playwright actually put the
  // complete answer into the field.
  const enteredValue =
    await textarea.inputValue();

  if (
    enteredValue !==
    result.answer
  ) {
    throw new Error(
      `Answer verification failed for question ${result.questionNumber}.`
    );
  }

  // ----------------------------------------------
  // COMPLETE SECTION
  // ----------------------------------------------

  await markSectionComplete(
    page
  );

  // ----------------------------------------------
  // SAVE VIA CONTINUE
  // ----------------------------------------------

  await clickContinue(
    page
  );

  console.log(
    `Saved question ${result.questionNumber}.`
  );

  return true;
}

// ==================================================
// MAIN
// ==================================================

async function fillApplication(
  vacancyUrl
) {
  if (
    !fs.existsSync(
      AUTH_FILE
    )
  ) {
    throw new Error(
      `No saved login session found at ${AUTH_FILE}`
    );
  }

  const vacancyReference =
    getVacancyReferenceFromUrl(
      vacancyUrl
    );

  if (!vacancyReference) {
    throw new Error(
      "Could not extract vacancy reference from URL."
    );
  }

  console.log(
    "========================================"
  );

  console.log(
    "GOV.UK FILL-ONLY TEST"
  );

  console.log(
    "========================================"
  );

  console.log(
    `\nVacancy reference: ${vacancyReference}`
  );

  // ------------------------------------------------
  // GET VACANCY
  // ------------------------------------------------

  console.log(
    "\nGetting full vacancy information..."
  );

  const vacancy =
    await findVacancy({
      vacancyReference,
    });

  if (!vacancy) {
    throw new Error(
      `Could not find vacancy ${vacancyReference}.`
    );
  }

  console.log(
    `Found: ${vacancy.title}`
  );

  console.log(
    `Employer: ${vacancy.employerName}`
  );

  // ------------------------------------------------
  // BROWSER
  // ------------------------------------------------

  const browser =
    await chromium.launch({
      headless: false,
    });

  const context =
    await browser.newContext({
      storageState:
        AUTH_FILE,
    });

  const page =
    await context.newPage();

  try {
    // ----------------------------------------------
    // VACANCY PAGE
    // ----------------------------------------------

    console.log(
      "\nOpening vacancy..."
    );

    await page.goto(
      vacancyUrl,
      {
        waitUntil:
          "domcontentloaded",
      }
    );

    let applicationControl =
      getApplicationControl(
        page
      );

    try {
      await applicationControl.waitFor({
        state: "visible",
        timeout: 5000,
      });
    } catch {
      console.log(
        "\nSign in manually if required."
      );

      console.log(
        "Complete phone verification if requested."
      );

      console.log(
        "Return to the vacancy page and press ENTER here."
      );

      await waitForEnter();

      await context.storageState({
        path: AUTH_FILE,
      });

      await page.goto(
        vacancyUrl,
        {
          waitUntil:
            "domcontentloaded",
        }
      );

      applicationControl =
        getApplicationControl(
          page
        );

      await applicationControl.waitFor({
        state: "visible",
        timeout: 15000,
      });
    }

    // ----------------------------------------------
    // APPLICATION OVERVIEW
    // ----------------------------------------------

    console.log(
      "\nOpening application..."
    );

    await applicationControl.click();

    await page.waitForTimeout(
      1000
    );

    const overviewUrl =
      page.url();

    console.log(
      `Application overview: ${overviewUrl}`
    );

    // ----------------------------------------------
    // DISCOVER QUESTIONS
    // ----------------------------------------------

    const questionLinks =
      await getQuestionLinks(
        page,
        overviewUrl
      );

    console.log(
      `\nFound ${questionLinks.length} written question(s).`
    );

    if (
      questionLinks.length === 0
    ) {
      throw new Error(
        "No supported written questions were found."
      );
    }

    // ----------------------------------------------
    // READ QUESTIONS
    // ----------------------------------------------

    const questions =
      await readQuestions(
        page,
        questionLinks
      );

    // ----------------------------------------------
    // GENERATE
    // ----------------------------------------------

    console.log(
      "\n========================================"
    );

    console.log(
      "GENERATING ANSWERS"
    );

    console.log(
      "========================================\n"
    );

    const results =
      await generateApplicationAnswers({
        questions,
        vacancy,
      });

    // ----------------------------------------------
    // SHOW PREVIEW BEFORE MODIFYING APPLICATION
    // ----------------------------------------------

    printPreview(
      results
    );

    const manualReviews =
      results.filter(
        (result) =>
          result.status ===
          "manual_review"
      );

    if (
      manualReviews.length > 0
    ) {
      console.log(
        "\n========================================"
      );

      console.log(
        "MANUAL REVIEW REQUIRED"
      );

      console.log(
        "========================================"
      );

      console.log(
        `\n${manualReviews.length} answer(s) require manual review.`
      );

      console.log(
        "For safety, NO generated answers will be written during this run."
      );

      await page.goto(
        overviewUrl,
        {
          waitUntil:
            "domcontentloaded",
        }
      );

      console.log(
        "\nBrowser will remain open for 5 minutes."
      );

      await page.waitForTimeout(
        300000
      );

      return;
    }

    // ----------------------------------------------
    // FILL QUESTIONS
    // ----------------------------------------------

    console.log(
      "\n========================================"
    );

    console.log(
      "FILLING WRITTEN ANSWERS"
    );

    console.log(
      "========================================"
    );

    let savedCount = 0;

    for (
      let i = 0;
      i < results.length;
      i++
    ) {
      const saved =
        await fillQuestion({
          page,
          questionLink:
            questionLinks[i],
          result:
            results[i],
        });

      if (saved) {
        savedCount++;
      }
    }

    // ----------------------------------------------
    // RETURN TO OVERVIEW
    // ----------------------------------------------

    await page.goto(
      overviewUrl,
      {
        waitUntil:
          "domcontentloaded",
      }
    );

    // ----------------------------------------------
    // SAVE LOGIN SESSION
    // ----------------------------------------------

    await context.storageState({
      path: AUTH_FILE,
    });

    // ----------------------------------------------
    // STOP — NO FINAL SUBMISSION
    // ----------------------------------------------

    console.log(
      "\n========================================"
    );

    console.log(
      "FILL-ONLY TEST COMPLETE"
    );

    console.log(
      "========================================"
    );

    console.log(
      `\nSaved ${savedCount}/${results.length} written answers.`
    );

    console.log(
      "\nThe browser is now on the application overview."
    );

    console.log(
      "FINAL SUBMISSION HAS NOT BEEN PERFORMED."
    );

    console.log(
      "Inspect the application manually."
    );

    console.log(
      "\nBrowser will remain open for 5 minutes."
    );

    await page.waitForTimeout(
      300000
    );
  } finally {
    await context
      .storageState({
        path: AUTH_FILE,
      })
      .catch(() => {});

    await browser.close();
  }
}

// ==================================================
// COMMAND LINE
// ==================================================

const vacancyUrl =
  process.argv[2];

if (!vacancyUrl) {
  console.error(
    'Usage: node src/applicants/govuk.js "VACANCY_URL"'
  );

  process.exit(1);
}

fillApplication(
  vacancyUrl
).catch((error) => {
  console.error(
    "\nFill-only test failed:"
  );

  console.error(error);

  process.exitCode = 1;
});