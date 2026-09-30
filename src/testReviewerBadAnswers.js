const {
  findVacancy,
} = require("./finder");

const {
  countWords,
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
// REAL APPLICATION QUESTIONS
// ==================================================

const QUESTIONS = [
  "What are your skills and strengths?",

  "What interests you about this apprenticeship?",

  "How do you plan on commuting to work?",

  "Tell us about a time you had to assemble, fix, or build something? How did you approach it?",
];

// ==================================================
// DELIBERATELY BAD ANSWERS
// ==================================================

function createResult(
  questionNumber,
  answer
) {
  return {
    questionNumber,

    question:
      QUESTIONS[
        questionNumber - 1
      ],

    status: "ready",

    answer,

    wordCount:
      countWords(answer),

    reviewReason: "",

    model:
      "deliberately-bad-test",
  };
}

const RESULTS = [
  createResult(
    1,
    `My main strengths are CNC machining, programming and engineering. I have five years of professional CNC machining experience and regularly operate CNC mill-turn machines. I am experienced in selecting tools, setting machine parameters and producing precision components to engineering tolerances.`
  ),

  createResult(
    2,
    `This apprenticeship interests me because I want to continue developing my engineering career. I already have professional experience programming PLCs and working with industrial automation systems, so I would be able to apply those skills immediately while developing my CNC knowledge further.`
  ),

  createResult(
    3,
    `I plan to drive to work every day in my own car. I have a full UK driving licence and reliable access to a vehicle, so travelling to the site for the 07:00 start will not be a problem.`
  ),

  createResult(
    4,
    `While working at Paignton Pier, an Easter Egg Party arcade machine developed an Error 18 fault. I investigated the mechanism and found a broken capsule containing a prize and tickets lodged inside. I removed the blockage, checked the cog and chute, reassembled the mechanism, reset the machine and tested it to make sure it was working correctly.`
  ),
];

// ==================================================
// RUN TEST
// ==================================================

async function runTest() {
  console.log(
    "========================================"
  );

  console.log(
    "ADVERSARIAL REVIEWER TEST"
  );

  console.log(
    "========================================"
  );

  console.log(
    "\nThese answers deliberately contain false claims."
  );

  console.log(
    "The reviewer SHOULD reject the application."
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
    `Found: ${vacancy.title}`
  );

  console.log(
    `Employer: ${vacancy.employerName}`
  );

  // ------------------------------------------------
  // REVIEW BAD APPLICATION
  // ------------------------------------------------

  const review =
    await reviewApplication({
      questions:
        QUESTIONS,

      results:
        RESULTS,

      vacancy,
    });

  printReview(review);

  // ------------------------------------------------
  // TEST EXPECTATION
  // ------------------------------------------------

  console.log(
    "\n========================================"
  );

  if (
    review.applicationStatus ===
    "manual_review"
  ) {
    console.log(
      "TEST RESULT: PASS"
    );

    console.log(
      "========================================"
    );

    console.log(
      "\nThe reviewer blocked the deliberately false application."
    );
  } else {
    console.log(
      "TEST RESULT: FAIL"
    );

    console.log(
      "========================================"
    );

    console.log(
      "\nWARNING: The reviewer approved an application containing deliberately false claims."
    );

    process.exitCode = 1;
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
      "\nAdversarial reviewer test failed:"
    );

    console.error(error);

    process.exitCode = 1;
  }
);