const {
  findVacancy,
} = require("./finder");

const {
  generateApplicationAnswers,
  printPreview,
} = require("./answerGenerator");

const {
  reviewApplication,
  printReview,
} = require("./applicationReviewer");

// ==================================================
// TEST VACANCY
// ==================================================

const VACANCY_REFERENCE =
  "2000054368";

// ==================================================
// REAL QUESTIONS WE DISCOVERED
// ==================================================

const QUESTIONS = [
  "What are your skills and strengths?",

  "What interests you about this apprenticeship?",

  "How do you plan on commuting to work?",

  "Tell us about a time you had to assemble, fix, or build something? How did you approach it?",
];

// ==================================================
// TEST
// ==================================================

async function runTest() {
  console.log(
    "========================================"
  );

  console.log(
    "AI APPLICATION REVIEW TEST"
  );

  console.log(
    "========================================"
  );

  console.log(
    `\nVacancy: ${VACANCY_REFERENCE}`
  );

  // ------------------------------------------------
  // GET REAL VACANCY
  // ------------------------------------------------

  console.log(
    "\nGetting real vacancy information..."
  );

  const vacancy =
    await findVacancy({
      vacancyReference:
        VACANCY_REFERENCE,
    });

  if (!vacancy) {
    throw new Error(
      `Could not find vacancy ${VACANCY_REFERENCE}.`
    );
  }

  console.log(
    `\nFound: ${vacancy.title}`
  );

  console.log(
    `Employer: ${vacancy.employerName}`
  );

  // ------------------------------------------------
  // GENERATE ANSWERS
  // ------------------------------------------------

  console.log(
    "\nGenerating application..."
  );

  const results =
    await generateApplicationAnswers({
      questions: QUESTIONS,
      vacancy,
    });

  // ------------------------------------------------
  // SHOW GENERATED APPLICATION
  // ------------------------------------------------

  printPreview(results);

  // ------------------------------------------------
  // INDEPENDENT REVIEW
  // ------------------------------------------------

  const review =
    await reviewApplication({
      questions: QUESTIONS,
      results,
      vacancy,
    });

  // ------------------------------------------------
  // SHOW REVIEW
  // ------------------------------------------------

  printReview(review);

  // ------------------------------------------------
  // FINAL DECISION
  // ------------------------------------------------

  if (
    review.applicationStatus ===
    "approved"
  ) {
    console.log(
      "\n========================================"
    );

    console.log(
      "AUTOMATION DECISION: APPROVED"
    );

    console.log(
      "========================================"
    );

    console.log(
      "\nThis application would be allowed to proceed to the next automation stage."
    );
  } else {
    console.log(
      "\n========================================"
    );

    console.log(
      "AUTOMATION DECISION: STOP"
    );

    console.log(
      "========================================"
    );

    console.log(
      "\nThis application would be sent for manual review."
    );
  }

  console.log(
    "\nNo GOV.UK application was opened or changed."
  );

  console.log(
    "Nothing was submitted."
  );
}

// ==================================================
// RUN
// ==================================================

runTest().catch(
  (error) => {
    console.error(
      "\nReviewer test failed:"
    );

    console.error(error);

    process.exitCode = 1;
  }
);