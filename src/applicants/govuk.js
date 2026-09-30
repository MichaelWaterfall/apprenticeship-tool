const { chromium } = require("playwright");
const fs = require("fs");
const path = require("path");

const { findVacancy } = require("../finder");

const {
  generateApplicationAnswers,
  printPreview,
} = require("../answerGenerator");

const {
  reviewApplication,
  printReview,
} = require("../applicationReviewer");

// ==================================================
// SETTINGS
// ==================================================

const AUTH_FILE = "playwright/.auth/govuk.json";

const APPLICATION_LOG_FILE = path.join(
  __dirname,
  "..",
  "..",
  "data",
  "application-log.json"
);

const BROWSER_OPEN_TIME = 300000;

// ==================================================
// WAIT FOR ENTER
// ==================================================

function waitForEnter(message) {
  return new Promise((resolve) => {
    console.log(message);

    process.stdin.resume();

    process.stdin.once("data", () => {
      resolve();
    });
  });
}

// ==================================================
// TEXT
// ==================================================

function normaliseText(value) {
  return String(value || "")
    .replace(/\s+/g, " ")
    .trim();
}

// ==================================================
// SIGNED-OUT DETECTION
// ==================================================

async function isSignedOut(page) {
  const signInControl = page.getByText(
    /^sign in or create an account$/i
  );

  return (await signInControl.count()) > 0;
}

// ==================================================
// APPLICATION CONTROL
// ==================================================

async function getApplicationControl(page) {
  const controlName =
    /^(apply now|apply for apprenticeship|continue application|continue your application)$/i;

  // Try links first.
  const links = page.getByRole("link", {
    name: controlName,
  });

  if ((await links.count()) > 0) {
    return links.first();
  }

  // Then buttons / submit controls.
  const buttons = page.getByRole("button", {
    name: controlName,
  });

  if ((await buttons.count()) > 0) {
    return buttons.first();
  }

  return null;
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
  let parsed;

  try {
    parsed = new URL(
      String(vacancyUrl)
    );
  } catch {
    throw new Error(
      "The supplied apprenticeship URL is not valid."
    );
  }

  /*
    Supports both:

    /apprenticeship/reference/2000054368

    and:

    /apprenticeship/VAC2000053529
  */

  const match =
    parsed.pathname.match(
      /\/apprenticeship\/(?:reference\/)?(?:VAC)?(\d+)\/?$/i
    );

  if (!match) {
    throw new Error(
      "Could not determine the vacancy reference from the GOV.UK vacancy URL."
    );
  }

  return normaliseVacancyReference(
    match[1]
  );
}

// ==================================================
// QUESTION TEXT
// ==================================================

async function getQuestionText(page) {
  const heading =
    page.locator("h1").first();

  await heading.waitFor({
    state: "visible",
  });

  const question =
    normaliseText(
      await heading.textContent()
    );

  if (!question) {
    throw new Error(
      "Could not read the application question."
    );
  }

  return question;
}

// ==================================================
// PAGE DIAGNOSTICS
// ==================================================

async function printPageDiagnostics(page) {
  console.log(
    "\n========================================"
  );

  console.log(
    "PAGE DIAGNOSTICS"
  );

  console.log(
    "========================================"
  );

  console.log(
    `\nURL:\n${page.url()}`
  );

  try {
    console.log(
      `\nTITLE:\n${await page.title()}`
    );
  } catch {
    console.log(
      "\nTITLE:\nCould not read title."
    );
  }

  // ------------------------------------------------
  // HEADINGS
  // ------------------------------------------------

  try {
    const headings =
      await page
        .locator("h1, h2, h3")
        .allTextContents();

    console.log(
      "\nHEADINGS:"
    );

    const useful =
      headings
        .map(normaliseText)
        .filter(Boolean);

    if (useful.length === 0) {
      console.log("(none)");
    }

    for (const heading of useful) {
      console.log(
        `- ${heading}`
      );
    }
  } catch {
    console.log(
      "\nCould not inspect headings."
    );
  }

  // ------------------------------------------------
  // FIELDSET LEGENDS
  // ------------------------------------------------

  try {
    const legends =
      await page
        .locator("legend")
        .allTextContents();

    console.log(
      "\nFIELDSET LEGENDS:"
    );

    const useful =
      legends
        .map(normaliseText)
        .filter(Boolean);

    if (useful.length === 0) {
      console.log("(none)");
    }

    for (const legend of useful) {
      console.log(
        `- ${legend}`
      );
    }
  } catch {
    console.log(
      "\nCould not inspect fieldset legends."
    );
  }

  // ------------------------------------------------
  // BUTTONS
  // ------------------------------------------------

  try {
    const buttons =
      await page
        .locator(
          'button, input[type="submit"]'
        )
        .evaluateAll(
          (elements) =>
            elements.map(
              (element) =>
                (
                  element.innerText ||
                  element.value ||
                  element.getAttribute(
                    "aria-label"
                  ) ||
                  ""
                )
                  .replace(
                    /\s+/g,
                    " "
                  )
                  .trim()
            )
        );

    console.log(
      "\nVISIBLE BUTTON / SUBMIT TEXT:"
    );

    const useful =
      buttons.filter(Boolean);

    if (useful.length === 0) {
      console.log("(none)");
    }

    for (const button of useful) {
      console.log(
        `- ${button}`
      );
    }
  } catch {
    console.log(
      "\nCould not inspect buttons."
    );
  }

  // ------------------------------------------------
  // LINKS
  // ------------------------------------------------

  try {
    const links =
      await page
        .locator("a[href]")
        .evaluateAll(
          (anchors) =>
            anchors
              .map(
                (anchor) => ({
                  text:
                    (
                      anchor.innerText ||
                      ""
                    )
                      .replace(
                        /\s+/g,
                        " "
                      )
                      .trim(),

                  href:
                    anchor.href ||
                    "",
                })
              )
              .filter(
                (item) =>
                  item.text
              )
        );

    console.log(
      "\nVISIBLE LINKS:"
    );

    if (links.length === 0) {
      console.log("(none)");
    }

    for (const link of links) {
      console.log(
        `- ${link.text}`
      );

      console.log(
        `  ${link.href}`
      );
    }
  } catch {
    console.log(
      "\nCould not inspect links."
    );
  }

  console.log(
    "\n========================================"
  );
}

// ==================================================
// QUESTION LINKS
// ==================================================

async function getQuestionLinks(page) {
  return page
    .locator("a[href]")
    .evaluateAll(
      (anchors) => {
        const results = [];

        for (
          const anchor of anchors
        ) {
          const href =
            anchor.href || "";

          const lower =
            href.toLowerCase();

          const isWrittenQuestion =
            lower.includes(
              "/skillsandstrengths"
            ) ||
            lower.includes(
              "/what-interests-you"
            ) ||
            lower.includes(
              "/additional-question/"
            );

          if (
            !isWrittenQuestion
          ) {
            continue;
          }

          if (
            !results.includes(
              href
            )
          ) {
            results.push(
              href
            );
          }
        }

        return results;
      }
    );
}

// ==================================================
// READ QUESTIONS
// ==================================================

async function readQuestions({
  page,
  questionLinks,
}) {
  const questions = [];

  console.log(
    "\nREADING REAL APPLICATION QUESTIONS"
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
      questionLinks[i],
      {
        waitUntil:
          "domcontentloaded",
      }
    );

    const question =
      await getQuestionText(
        page
      );

    questions.push(
      question
    );

    console.log(
      `${i + 1}. ${question}`
    );
  }

  return questions;
}

// ==================================================
// SECTION COMPLETE
// ==================================================

async function markSectionComplete(page) {
  const selectors = [
    'input[name="IsSectionComplete"][value="true"]',
    'input[name="IsSectionCompleted"][value="true"]',
  ];

  for (
    const selector of selectors
  ) {
    const input =
      page.locator(
        selector
      );

    if (
      (await input.count()) >
      0
    ) {
      await input
        .first()
        .check();

      return;
    }
  }

  throw new Error(
    "Could not find the section-complete control."
  );
}

// ==================================================
// QUESTION CONTINUE
// ==================================================

async function clickContinue(page) {
  const button =
    page
      .getByRole(
        "button",
        {
          name:
            /^continue$/i,
        }
      )
      .first();

  if (
    (await button.count()) ===
    0
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
// FILL QUESTION
// ==================================================

async function fillQuestion({
  page,
  questionUrl,
  expectedQuestion,
  answer,
  questionNumber,
}) {
  console.log(
    `\nFilling question ${questionNumber}...`
  );

  await page.goto(
    questionUrl,
    {
      waitUntil:
        "domcontentloaded",
    }
  );

  // ------------------------------------------------
  // VERIFY QUESTION
  // ------------------------------------------------

  const liveQuestion =
    await getQuestionText(
      page
    );

  if (
    normaliseText(
      liveQuestion
    ) !==
    normaliseText(
      expectedQuestion
    )
  ) {
    throw new Error(
      [
        `Question ${questionNumber} changed before filling.`,
        `Expected: ${expectedQuestion}`,
        `Found: ${liveQuestion}`,
      ].join("\n")
    );
  }

  // ------------------------------------------------
  // TEXTAREA
  // ------------------------------------------------

  const textareas =
    page.locator(
      "textarea"
    );

  const textareaCount =
    await textareas.count();

  if (
    textareaCount !== 1
  ) {
    throw new Error(
      `Expected exactly one textarea for question ${questionNumber}, but found ${textareaCount}.`
    );
  }

  const textarea =
    textareas.first();

  // ------------------------------------------------
  // FILL
  // ------------------------------------------------

  await textarea.fill(
    answer
  );

  // ------------------------------------------------
  // VERIFY
  // ------------------------------------------------

  const filledValue =
    await textarea.inputValue();

  if (
    filledValue !== answer
  ) {
    throw new Error(
      `Textarea verification failed for question ${questionNumber}.`
    );
  }

  // ------------------------------------------------
  // COMPLETE
  // ------------------------------------------------

  await markSectionComplete(
    page
  );

  await clickContinue(
    page
  );

  console.log(
    `Question ${questionNumber} saved.`
  );
}

// ==================================================
// OVERVIEW CONTINUE
// ==================================================

async function clickOverviewContinue({
  page,
  overviewUrl,
}) {
  console.log(
    "\nChecking overview Continue link..."
  );

  const currentUrl =
    page
      .url()
      .replace(
        /\/$/,
        ""
      );

  const expectedOverviewUrl =
    overviewUrl.replace(
      /\/$/,
      ""
    );

  if (
    currentUrl !==
    expectedOverviewUrl
  ) {
    throw new Error(
      [
        "Expected to be on the application overview before advancing.",
        `Expected: ${expectedOverviewUrl}`,
        `Found: ${currentUrl}`,
      ].join("\n")
    );
  }

  // ------------------------------------------------
  // CONTINUE LINK
  // ------------------------------------------------

  const continueLinks =
    page.getByRole(
      "link",
      {
        name:
          /^continue$/i,
      }
    );

  const continueCount =
    await continueLinks.count();

  if (
    continueCount !== 1
  ) {
    throw new Error(
      `Expected exactly one Continue link on the application overview, but found ${continueCount}.`
    );
  }

  const continueLink =
    continueLinks.first();

  // ------------------------------------------------
  // HREF
  // ------------------------------------------------

  const href =
    await continueLink.getAttribute(
      "href"
    );

  if (!href) {
    throw new Error(
      "The overview Continue link does not have an href."
    );
  }

  const expectedPreviewUrl =
    `${expectedOverviewUrl}/preview`;

  const actualDestination =
    new URL(
      href,
      page.url()
    )
      .href
      .replace(
        /\/$/,
        ""
      );

  if (
    actualDestination !==
    expectedPreviewUrl
  ) {
    throw new Error(
      [
        "The overview Continue link points somewhere unexpected.",
        `Expected: ${expectedPreviewUrl}`,
        `Found: ${actualDestination}`,
      ].join("\n")
    );
  }

  console.log(
    "Overview Continue link verified."
  );

  console.log(
    "Destination verified as this application's /preview page."
  );

  // ------------------------------------------------
  // OPEN PREVIEW
  // ------------------------------------------------

  await continueLink.click();

  await page.waitForLoadState(
    "domcontentloaded"
  );

  const arrivedUrl =
    page
      .url()
      .replace(
        /\/$/,
        ""
      );

  if (
    arrivedUrl !==
    expectedPreviewUrl
  ) {
    throw new Error(
      [
        "Continue link did not arrive at the expected preview page.",
        `Expected: ${expectedPreviewUrl}`,
        `Found: ${arrivedUrl}`,
      ].join("\n")
    );
  }

  console.log(
    "Application preview page opened."
  );
}

// ==================================================
// RETURN TO OVERVIEW
// ==================================================

async function returnToOverview({
  page,
  overviewUrl,
}) {
  await page.goto(
    overviewUrl,
    {
      waitUntil:
        "domcontentloaded",
    }
  );
}

// ==================================================
// AUTH
// ==================================================

async function saveAuthStateIfSignedIn(
  context,
  page
) {
  if (
    await isSignedOut(
      page
    )
  ) {
    console.log(
      "\nSigned-out page detected. Existing auth file will NOT be overwritten."
    );

    return false;
  }

  await context.storageState({
    path: AUTH_FILE,
  });

  return true;
}

// ==================================================
// KEEP OPEN
// ==================================================

async function keepBrowserOpen(page) {
  console.log(
    "\nBrowser will remain open for 5 minutes for inspection."
  );

  await page.waitForTimeout(
    BROWSER_OPEN_TIME
  );
}

// ==================================================
// APPLICATION LOG
// ==================================================

function readApplicationLog() {
  if (
    !fs.existsSync(
      APPLICATION_LOG_FILE
    )
  ) {
    return [];
  }

  try {
    const parsed =
      JSON.parse(
        fs.readFileSync(
          APPLICATION_LOG_FILE,
          "utf8"
        )
      );

    return Array.isArray(
      parsed
    )
      ? parsed
      : [];
  } catch (error) {
    throw new Error(
      `Could not read application log: ${error.message}`
    );
  }
}

function writeApplicationLog(
  records
) {
  fs.mkdirSync(
    path.dirname(
      APPLICATION_LOG_FILE
    ),
    {
      recursive: true,
    }
  );

  fs.writeFileSync(
    APPLICATION_LOG_FILE,
    JSON.stringify(
      records,
      null,
      2
    ),
    "utf8"
  );
}

function getSubmissionRecord(
  vacancyReference
) {
  const records =
    readApplicationLog();

  return records
    .filter(
      (record) =>
        String(
          record.vacancyReference
        ) ===
          String(
            vacancyReference
          ) &&
        [
          "submission_attempted",
          "submitted",
        ].includes(
          record.status
        )
    )
    .at(-1);
}

function recordApplicationEvent({
  vacancyReference,
  vacancyTitle,
  employerName,
  status,
  details = "",
}) {
  const records =
    readApplicationLog();

  records.push({
    vacancyReference:
      String(
        vacancyReference
      ),

    vacancyTitle:
      vacancyTitle || "",

    employerName:
      employerName || "",

    status,

    details,

    timestamp:
      new Date().toISOString(),
  });

  writeApplicationLog(
    records
  );
}

// ==================================================
// FINAL PAGE
// ==================================================

async function getFinalSubmissionControls(
  page
) {
  // ------------------------------------------------
  // REVIEW PAGE H1
  // ------------------------------------------------

  const pageHeading =
    page
      .locator("h1")
      .first();

  await pageHeading.waitFor({
    state: "visible",
  });

  const pageHeadingText =
    normaliseText(
      await pageHeading.textContent()
    );

  if (
    pageHeadingText !==
    "Check your application before submitting"
  ) {
    throw new Error(
      [
        'Expected page heading "Check your application before submitting".',
        `Found: "${pageHeadingText}"`,
      ].join("\n")
    );
  }

  console.log(
    'Review page heading verified: "Check your application before submitting"'
  );

  // ------------------------------------------------
  // SUBMISSION SECTION
  // ------------------------------------------------

  const submissionSectionTexts =
    page.getByText(
      "Submit your application",
      {
        exact: true,
      }
    );

  const submissionSectionCount =
    await submissionSectionTexts.count();

  if (
    submissionSectionCount !==
    1
  ) {
    throw new Error(
      `Expected exactly one visible "Submit your application" section label, but found ${submissionSectionCount}.`
    );
  }

  const submissionSectionText =
    submissionSectionTexts.first();

  if (
    !(await submissionSectionText.isVisible())
  ) {
    throw new Error(
      '"Submit your application" section label exists but is not visible.'
    );
  }

  console.log(
    'Final section text verified: "Submit your application"'
  );

  // ------------------------------------------------
  // ACKNOWLEDGEMENT
  // ------------------------------------------------

  const acknowledgement =
    page.getByRole(
      "checkbox",
      {
        name:
          /I understand that I won['’]t be able to make any changes after I submit my application/i,
      }
    );

  const acknowledgementCount =
    await acknowledgement.count();

  if (
    acknowledgementCount !==
    1
  ) {
    throw new Error(
      `Expected exactly one final acknowledgement checkbox, but found ${acknowledgementCount}.`
    );
  }

  const acknowledgementCheckbox =
    acknowledgement.first();

  if (
    !(await acknowledgementCheckbox.isVisible())
  ) {
    throw new Error(
      "Final acknowledgement checkbox is not visible."
    );
  }

  console.log(
    "Final acknowledgement checkbox verified."
  );

  // ------------------------------------------------
  // SUBMIT BUTTON
  // ------------------------------------------------

  const submitButtons =
    page.getByRole(
      "button",
      {
        name:
          "Submit",

        exact: true,
      }
    );

  const submitCount =
    await submitButtons.count();

  if (
    submitCount !== 1
  ) {
    throw new Error(
      `Expected exactly one final Submit button, but found ${submitCount}.`
    );
  }

  const submitButton =
    submitButtons.first();

  if (
    !(await submitButton.isVisible())
  ) {
    throw new Error(
      "Final Submit button is not visible."
    );
  }

  console.log(
    "Final Submit button verified."
  );

  return {
    acknowledgement:
      acknowledgementCheckbox,

    submitButton,
  };
}

// ==================================================
// CONFIRM SUBMISSION
// ==================================================

async function verifySubmissionConfirmation(
  page
) {
  const heading =
    normaliseText(
      await page
        .locator("h1")
        .first()
        .textContent()
        .catch(
          () => ""
        )
    );

  const bodyText =
    normaliseText(
      await page
        .locator("body")
        .textContent()
        .catch(
          () => ""
        )
    );

  const stillOnReviewPage =
    heading ===
    "Check your application before submitting";

  const hasSubmittedLanguage =
    /(?:application.{0,40}submitted|submitted.{0,40}application)/i.test(
      `${heading} ${bodyText}`
    );

  return {
    confirmed:
      !stillOnReviewPage &&
      hasSubmittedLanguage,

    heading,

    url:
      page.url(),
  };
}

// ==================================================
// SUBMIT
// ==================================================

async function submitApplication({
  page,
  vacancyReference,
  vacancy,
}) {
  // ------------------------------------------------
  // DUPLICATE PROTECTION
  // ------------------------------------------------

  const existingRecord =
    getSubmissionRecord(
      vacancyReference
    );

  if (
    existingRecord
  ) {
    throw new Error(
      [
        `Automatic submission blocked for vacancy ${vacancyReference}.`,
        `The local application log already contains status "${existingRecord.status}".`,
        "This prevents a blind duplicate submission attempt.",
        "Inspect the application manually before trying anything else.",
      ].join("\n")
    );
  }

  // ------------------------------------------------
  // VERIFY AGAIN
  // ------------------------------------------------

  const {
    acknowledgement,
    submitButton,
  } =
    await getFinalSubmissionControls(
      page
    );

  console.log(
    "\nFinal review/submission page verified."
  );

  console.log(
    "Acknowledgement wording verified."
  );

  console.log(
    "Submit button verified."
  );

  // ------------------------------------------------
  // ACKNOWLEDGE
  // ------------------------------------------------

  if (
    !(await acknowledgement.isChecked())
  ) {
    await acknowledgement.check();
  }

  if (
    !(await acknowledgement.isChecked())
  ) {
    throw new Error(
      "Final acknowledgement checkbox could not be verified as checked."
    );
  }

  console.log(
    "Final acknowledgement checked."
  );

  // ------------------------------------------------
  // LOG BEFORE CLICK
  // ------------------------------------------------

  recordApplicationEvent({
    vacancyReference,

    vacancyTitle:
      vacancy.title,

    employerName:
      vacancy.employerName,

    status:
      "submission_attempted",

    details:
      "Final review page, acknowledgement and Submit button verified. Submit click about to be performed.",
  });

  // ------------------------------------------------
  // CLICK ONCE
  // ------------------------------------------------

  console.log(
    "\nClicking final Submit ONCE..."
  );

  await submitButton.click();

  await page
    .waitForLoadState(
      "domcontentloaded"
    )
    .catch(
      () => {}
    );

  // ------------------------------------------------
  // CONFIRM
  // ------------------------------------------------

  const confirmation =
    await verifySubmissionConfirmation(
      page
    );

  if (
    !confirmation.confirmed
  ) {
    throw new Error(
      [
        "SUBMISSION STATUS UNKNOWN.",
        "The Submit button was clicked, but the confirmation page could not be verified.",
        `Current URL: ${confirmation.url}`,
        `Current heading: ${confirmation.heading || "(none)"}`,
        "Do NOT rerun with --submit. Inspect the application manually.",
      ].join("\n")
    );
  }

  // ------------------------------------------------
  // LOG SUCCESS
  // ------------------------------------------------

  recordApplicationEvent({
    vacancyReference,

    vacancyTitle:
      vacancy.title,

    employerName:
      vacancy.employerName,

    status:
      "submitted",

    details:
      `Submission confirmation detected at ${confirmation.url}`,
  });

  return confirmation;
}

// ==================================================
// MAIN
// ==================================================

async function fillApplication(
  vacancyUrl,
  {
    submit = false,
  } = {}
) {
  const vacancyReference =
    getVacancyReferenceFromUrl(
      vacancyUrl
    );

  console.log(
    `Vacancy reference: ${vacancyReference}`
  );

  console.log(
    "\nGetting full vacancy information..."
  );

  const vacancy =
    await findVacancy({
      vacancyReference,
    });

  if (!vacancy) {
    throw new Error(
      `Could not find vacancy ${vacancyReference} in the apprenticeship API.`
    );
  }

  console.log(
    `Found vacancy: ${vacancy.title}`
  );

  console.log(
    `Employer: ${vacancy.employerName}`
  );

  // ------------------------------------------------
  // AUTH
  // ------------------------------------------------

  if (
    !fs.existsSync(
      AUTH_FILE
    )
  ) {
    throw new Error(
      `Authentication file not found: ${AUTH_FILE}`
    );
  }

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
    // ================================================
    // OPEN VACANCY
    // ================================================

    console.log(
      "\nOpening GOV.UK vacancy..."
    );

    await page.goto(
      vacancyUrl,
      {
        waitUntil:
          "domcontentloaded",
      }
    );

    if (
      await isSignedOut(
        page
      )
    ) {
      throw new Error(
        "GOV.UK session is signed out. Sign in manually and refresh the saved authentication state before continuing."
      );
    }

    // ================================================
    // APPLICATION CONTROL
    // ================================================

    const applicationControl =
      await getApplicationControl(
        page
      );

    if (
      !applicationControl
    ) {
      throw new Error(
        "Could not find Apply now / Apply for apprenticeship / Continue application."
      );
    }

    console.log(
      "Opening application..."
    );

    await applicationControl.click();

    await page.waitForLoadState(
      "domcontentloaded"
    );

    // ================================================
    // OVERVIEW
    // ================================================

    const overviewUrl =
      page.url();

    console.log(
      "\nApplication overview opened."
    );

    // ================================================
    // QUESTIONS
    // ================================================

    const questionLinks =
      await getQuestionLinks(
        page
      );

    if (
      questionLinks.length ===
      0
    ) {
      throw new Error(
        "No written application questions were discovered."
      );
    }

    console.log(
      `Found ${questionLinks.length} written question(s).`
    );

    // ================================================
    // READ
    // ================================================

    const questions =
      await readQuestions({
        page,
        questionLinks,
      });

    await returnToOverview({
      page,
      overviewUrl,
    });

    // ================================================
    // GENERATE
    // ================================================

    console.log(
      "\nGENERATING APPLICATION ANSWERS"
    );

    const results =
      await generateApplicationAnswers({
        questions,
        vacancy,
      });

    printPreview(
      results
    );

    // ================================================
    // GENERATOR GATE
    // ================================================

    const generatorManualReviews =
      results.filter(
        (result) =>
          result.status ===
          "manual_review"
      );

    if (
      generatorManualReviews.length >
      0
    ) {
      console.log(
        "\n========================================"
      );

      console.log(
        "GENERATOR REQUIRES MANUAL REVIEW"
      );

      console.log(
        "========================================"
      );

      for (
        const result of
        generatorManualReviews
      ) {
        console.log(
          `\nQuestion ${result.questionNumber}: ${result.reviewReason}`
        );
      }

      console.log(
        "\nAUTOMATION DECISION: STOP"
      );

      console.log(
        "No answers were filled during this run."
      );

      console.log(
        "FINAL SUBMISSION HAS NOT BEEN PERFORMED."
      );

      await returnToOverview({
        page,
        overviewUrl,
      });

      await saveAuthStateIfSignedIn(
        context,
        page
      );

      await keepBrowserOpen(
        page
      );

      return {
        status:
          "manual_review",

        stage:
          "generator",

        vacancyReference,
      };
    }

    // ================================================
    // REVIEW
    // ================================================

    console.log(
      "\nREVIEWING COMPLETE APPLICATION"
    );

    const review =
      await reviewApplication({
        questions,
        results,
        vacancy,
      });

    printReview(
      review
    );

    if (
      review.applicationStatus !==
      "approved"
    ) {
      console.log(
        "\n========================================"
      );

      console.log(
        "APPLICATION STOPPED"
      );

      console.log(
        "========================================"
      );

      console.log(
        "\nThe independent reviewer did not approve the application."
      );

      console.log(
        "No answers were filled during this run."
      );

      console.log(
        "FINAL SUBMISSION HAS NOT BEEN PERFORMED."
      );

      await returnToOverview({
        page,
        overviewUrl,
      });

      await saveAuthStateIfSignedIn(
        context,
        page
      );

      await keepBrowserOpen(
        page
      );

      return {
        status:
          "manual_review",

        stage:
          "reviewer",

        vacancyReference,

        review,
      };
    }

    // ================================================
    // APPROVED
    // ================================================

    console.log(
      "\n========================================"
    );

    console.log(
      "APPLICATION APPROVED"
    );

    console.log(
      "========================================"
    );

    console.log(
      "\nGenerator: PASSED"
    );

    console.log(
      "Deterministic checks: PASSED"
    );

    console.log(
      "Independent AI review: APPROVED"
    );

    // ================================================
    // FILL
    // ================================================

    console.log(
      "\nFILLING APPROVED APPLICATION"
    );

    let savedCount = 0;

    for (
      let i = 0;
      i < results.length;
      i++
    ) {
      const result =
        results[i];

      await fillQuestion({
        page,

        questionUrl:
          questionLinks[i],

        expectedQuestion:
          result.question,

        answer:
          result.answer,

        questionNumber:
          result.questionNumber,
      });

      savedCount++;
    }

    // ================================================
    // RETURN OVERVIEW
    // ================================================

    await returnToOverview({
      page,
      overviewUrl,
    });

    await saveAuthStateIfSignedIn(
      context,
      page
    );

    console.log(
      `\nSaved ${savedCount}/${results.length} written answers.`
    );

    // ================================================
    // PREVIEW
    // ================================================

    console.log(
      "\nAdvancing from application overview..."
    );

    await clickOverviewContinue({
      page,
      overviewUrl,
    });

    // ================================================
    // FINAL CONTROLS
    // ================================================

    const finalControls =
      await getFinalSubmissionControls(
        page
      );

    console.log(
      '\nFinal review page verified: "Check your application before submitting"'
    );

    console.log(
      'Final submission section verified: "Submit your application"'
    );

    // ================================================
    // DRY RUN
    // ================================================

    if (!submit) {
      const isChecked =
        await finalControls
          .acknowledgement
          .isChecked();

      if (
        isChecked
      ) {
        throw new Error(
          [
            "Dry-run safety check failed.",
            "The final acknowledgement checkbox is already checked.",
            "The script will not alter it or proceed.",
          ].join("\n")
        );
      }

      console.log(
        "\n========================================"
      );

      console.log(
        "READY FOR FINAL SUBMISSION"
      );

      console.log(
        "========================================"
      );

      console.log(
        "\nThe complete application passed all gates."
      );

      console.log(
        "The application review page was verified."
      );

      console.log(
        "The final submission section was verified."
      );

      console.log(
        "The acknowledgement is UNCHECKED."
      );

      console.log(
        "The Submit button has NOT been clicked."
      );

      console.log(
        "\nRun again with --submit to permit the irreversible final submission."
      );

      await keepBrowserOpen(
        page
      );

      return {
        status:
          "ready_to_submit",

        vacancyReference,

        savedCount,

        totalQuestions:
          results.length,

        review,
      };
    }

    // ================================================
    // SUBMIT
    // ================================================

    console.log(
      "\n========================================"
    );

    console.log(
      "FINAL SUBMISSION ENABLED"
    );

    console.log(
      "========================================"
    );

    const confirmation =
      await submitApplication({
        page,
        vacancyReference,
        vacancy,
      });

    await saveAuthStateIfSignedIn(
      context,
      page
    );

    console.log(
      "\n========================================"
    );

    console.log(
      "APPLICATION SUBMITTED"
    );

    console.log(
      "========================================"
    );

    console.log(
      `\nVacancy: ${vacancy.title}`
    );

    console.log(
      `Employer: ${vacancy.employerName}`
    );

    console.log(
      `Reference: ${vacancyReference}`
    );

    console.log(
      `Confirmation heading: ${confirmation.heading}`
    );

    console.log(
      `Confirmation URL: ${confirmation.url}`
    );

    console.log(
      `\nSubmission logged to: ${APPLICATION_LOG_FILE}`
    );

    await keepBrowserOpen(
      page
    );

    return {
      status:
        "submitted",

      vacancyReference,

      savedCount,

      totalQuestions:
        results.length,

      review,

      confirmation,
    };
  } catch (error) {
    // ================================================
    // ERROR
    // ================================================

    console.error(
      "\n========================================"
    );

    console.error(
      "AUTOMATION ERROR"
    );

    console.error(
      "========================================"
    );

    console.error(
      `\n${error.message}`
    );

    await printPageDiagnostics(
      page
    ).catch(
      () => {}
    );

    await saveAuthStateIfSignedIn(
      context,
      page
    ).catch(
      () => {}
    );

    console.log(
      "\nThe browser will NOT close automatically."
    );

    console.log(
      "Inspect the page before continuing."
    );

    await waitForEnter(
      "\nPress ENTER in this terminal when you are finished inspecting the browser..."
    );

    throw error;
  } finally {
    await saveAuthStateIfSignedIn(
      context,
      page
    ).catch(
      () => {}
    );

    await browser.close();
  }
}

// ==================================================
// COMMAND LINE
// ==================================================

if (
  require.main === module
) {
  const args =
    process.argv.slice(2);

  const submit =
    args.includes(
      "--submit"
    );

  const suppliedUrl =
    args.find(
      (arg) =>
        !arg.startsWith(
          "--"
        )
    );

  const defaultVacancyUrl = [
    "https:",
    "",
    "www.findapprenticeship.service.gov.uk",
    "apprenticeship",
    "reference",
    "2000054368",
  ].join("/");

  const vacancyUrl =
    suppliedUrl ||
    defaultVacancyUrl;

  console.log(
    `Final submission enabled: ${
      submit
        ? "YES"
        : "NO"
    }`
  );

  fillApplication(
    vacancyUrl,
    {
      submit,
    }
  ).catch(
    (error) => {
      console.error(
        "\nGOV.UK application automation failed:"
      );

      console.error(
        error
      );

      process.exitCode =
        1;
    }
  );
}

// ==================================================
// EXPORTS
// ==================================================

module.exports = {
  fillApplication,
  getVacancyReferenceFromUrl,
  normaliseVacancyReference,
};