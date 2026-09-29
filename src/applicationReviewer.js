require("dotenv").config();

const OpenAI = require("openai");

const profile =
  require("./profile");

const {
  normaliseVacancy,
  countWords,
} = require("./answerGenerator");

// ==================================================
// OPENAI CLIENT
// ==================================================

if (!process.env.OPENAI_API_KEY) {
  throw new Error(
    "OPENAI_API_KEY is missing from the .env file."
  );
}

const openai =
  new OpenAI({
    apiKey:
      process.env.OPENAI_API_KEY,
  });

// ==================================================
// SETTINGS
// ==================================================

const MODEL =
  "gpt-5.6-luna";

const MAX_WORDS = 300;

// ==================================================
// REVIEW SCHEMA
// ==================================================

const REVIEW_SCHEMA = {
  type: "object",

  properties: {
    application_status: {
      type: "string",

      enum: [
        "approved",
        "manual_review",
      ],
    },

    summary: {
      type: "string",
    },

    questions: {
      type: "array",

      items: {
        type: "object",

        properties: {
          question_number: {
            type: "integer",
          },

          status: {
            type: "string",

            enum: [
              "approved",
              "manual_review",
            ],
          },

          issues: {
            type: "array",

            items: {
              type: "string",
            },
          },
        },

        required: [
          "question_number",
          "status",
          "issues",
        ],

        additionalProperties:
          false,
      },
    },

    application_issues: {
      type: "array",

      items: {
        type: "string",
      },
    },
  },

  required: [
    "application_status",
    "summary",
    "questions",
    "application_issues",
  ],

  additionalProperties: false,
};

// ==================================================
// REVIEWER INSTRUCTIONS
// ==================================================

const REVIEWER_INSTRUCTIONS = `
You are a strict quality-control reviewer for UK
apprenticeship applications.

You DO NOT write application answers.

You DO NOT improve answers.

You DO NOT rewrite answers.

Your only job is to decide whether the generated
application is safe and suitable to proceed
automatically or requires human review.

You receive:

1. The verified applicant profile
2. The real vacancy information
3. Every application question
4. Every generated answer

==================================================
DECISION RULE
==================================================

The application may be APPROVED only when every
individual answer is approved and there are no
application-level problems.

If you identify a material uncertainty, unsupported
claim, contradiction, factual problem or failure to
answer the question, choose MANUAL REVIEW.

Do not give the generator the benefit of the doubt
when a factual claim is unsupported.

However, do not reject harmless wording merely because
it could have been written differently.

This is a factual and quality-control review, not a
creative-writing competition.

==================================================
CHECK 1 — FACTUAL SUPPORT
==================================================

Every factual statement about the applicant must be
supported by the verified applicant profile.

Check especially:

- employment
- job responsibilities
- qualifications
- grades
- projects
- achievements
- technical experience
- engineering experience
- licences
- transport
- relocation
- personal circumstances

An answer must not turn an interest into experience.

For example:

"I want to learn CNC machining"

can be valid.

"I have CNC machining experience"

is invalid unless the profile establishes it.

==================================================
CHECK 2 — VACANCY ACCURACY
==================================================

Every factual statement about:

- the employer
- apprenticeship
- duties
- machinery
- technologies
- training
- location
- working hours
- qualifications
- products
- progression

must be supported by the supplied vacancy information.

Do not approve invented employer research.

==================================================
CHECK 3 — DRIVING / COMMUTING
==================================================

The applicant does not currently have a driving
licence.

This is primarily a factual constraint.

Do not require an answer to volunteer that fact unless
the question or vacancy makes it relevant.

Never approve an answer claiming that the applicant:

- drives;
- has a driving licence;
- owns a car;
- has access to a car;

unless verified information supports it.

The applicant IS willing to relocate for the right
apprenticeship.

A genuine plan to relocate is therefore supported.

Do not approve invented:

- bus routes
- train routes
- journey times
- accommodation already secured
- vehicle arrangements
- specific transport connections

A statement that the applicant WOULD arrange suitable
accommodation or local travel before starting is not
the same as claiming those arrangements already exist.

==================================================
CHECK 4 — ANSWERING THE QUESTION
==================================================

The answer must directly address the actual question.

Mark for manual review if it:

- avoids the question;
- misunderstands the question;
- gives an unrelated answer;
- fails to provide an example where an example was
  specifically requested;
- fails to explain motivation where motivation was
  requested.

==================================================
CHECK 5 — HONEST POSITIONING
==================================================

It is acceptable for an apprenticeship applicant to
say they want to learn a skill they do not yet have.

Do not reject an answer merely because the applicant
does not already possess specialist apprenticeship
skills.

Do reject an answer if it falsely implies existing
professional or specialist experience.

==================================================
CHECK 6 — APPLICATION QUALITY
==================================================

The answer should:

- sound natural;
- use British English;
- be understandable;
- be reasonably concise;
- be relevant to the vacancy;
- use specific evidence where appropriate.

Minor stylistic imperfections are NOT enough to force
manual review.

The threshold is whether the answer is appropriate to
send to a real employer.

==================================================
CHECK 7 — REPETITION
==================================================

Review the application as a whole.

Some overlap is natural.

Do not reject reasonable references to the same job or
strength in different answers.

Mark for manual review only if substantial repetition
makes the application noticeably poor or if the same
detailed story is unnecessarily reused.

==================================================
CHECK 8 — CONTRADICTIONS
==================================================

Compare all answers with one another.

Mark for manual review if answers contradict:

- each other;
- the applicant profile;
- the vacancy.

==================================================
CHECK 9 — WORD LIMIT
==================================================

Every answer must be 300 words or fewer.

==================================================
SPECIAL PRACTICAL EXAMPLE
==================================================

The verified arcade-machine example establishes that
an Easter Egg Party arcade machine developed an
Error 18 fault.

The applicant investigated the mechanism
methodically.

A broken capsule containing a prize and tickets had
become lodged in the mechanism and was causing the
blockage.

The applicant removed the blockage, checked the cog
and chute, reassembled the mechanism, reset the
machine and tested it.

Descriptions consistent with those facts are
supported.

==================================================
OUTPUT
==================================================

Return one review result for every question.

Use:

status = "approved"

only when that answer is safe to proceed.

Use:

status = "manual_review"

when human review is needed.

For an approved question:

issues = []

For a manual-review question:

issues must clearly explain the problem.

application_status must be "approved" ONLY when:

- every question is approved; AND
- application_issues is empty.

Do not rewrite the answers.
`;

// ==================================================
// DETERMINISTIC CHECKS
// ==================================================

function runDeterministicChecks({
  questions,
  results,
}) {
  const issues = [];

  if (!Array.isArray(questions)) {
    issues.push(
      "Questions are not an array."
    );

    return issues;
  }

  if (!Array.isArray(results)) {
    issues.push(
      "Generated results are not an array."
    );

    return issues;
  }

  if (
    questions.length === 0
  ) {
    issues.push(
      "No application questions were supplied."
    );
  }

  if (
    questions.length !==
    results.length
  ) {
    issues.push(
      `Question/result count mismatch: ${questions.length} questions and ${results.length} results.`
    );

    return issues;
  }

  for (
    let i = 0;
    i < results.length;
    i++
  ) {
    const expectedNumber =
      i + 1;

    const result =
      results[i];

    if (
      result.questionNumber !==
      expectedNumber
    ) {
      issues.push(
        `Result ${i + 1} has unexpected question number ${result.questionNumber}.`
      );
    }

    const expectedQuestion =
      String(
        questions[i] || ""
      )
        .replace(/\s+/g, " ")
        .trim();

    const resultQuestion =
      String(
        result.question || ""
      )
        .replace(/\s+/g, " ")
        .trim();

    if (
      expectedQuestion !==
      resultQuestion
    ) {
      issues.push(
        `Question text mismatch for question ${expectedNumber}.`
      );
    }

    if (
      result.status !== "ready"
    ) {
      issues.push(
        `Question ${expectedNumber} is not ready: ${result.reviewReason || "manual review required"}.`
      );

      continue;
    }

    if (
      typeof result.answer !==
        "string" ||
      !result.answer.trim()
    ) {
      issues.push(
        `Question ${expectedNumber} has no answer.`
      );

      continue;
    }

    const wordCount =
      countWords(
        result.answer
      );

    if (
      wordCount > MAX_WORDS
    ) {
      issues.push(
        `Question ${expectedNumber} contains ${wordCount} words and exceeds the ${MAX_WORDS}-word limit.`
      );
    }

    if (
      typeof result.wordCount ===
        "number" &&
      result.wordCount !==
        wordCount
    ) {
      issues.push(
        `Question ${expectedNumber} has inconsistent word-count data.`
      );
    }
  }

  return issues;
}

// ==================================================
// BUILD REVIEW PROMPT
// ==================================================

function buildReviewPrompt({
  questions,
  results,
  vacancy,
}) {
  const application =
    questions.map(
      (question, index) => {
        const result =
          results[index];

        return {
          question_number:
            index + 1,

          question,

          generator_status:
            result.status,

          answer:
            result.answer,

          word_count:
            countWords(
              result.answer || ""
            ),
        };
      }
    );

  return `
==================================================
VERIFIED APPLICANT PROFILE
==================================================

${JSON.stringify(
  profile,
  null,
  2
)}

==================================================
VERIFIED VACANCY INFORMATION
==================================================

${JSON.stringify(
  normaliseVacancy(vacancy),
  null,
  2
)}

==================================================
GENERATED APPLICATION
==================================================

${JSON.stringify(
  application,
  null,
  2
)}

==================================================
TASK
==================================================

Independently review the entire generated application.

Check every answer against BOTH factual sources.

Return exactly one question review for every supplied
question.

Do not rewrite any answer.

If uncertain about a material factual or application
quality issue, require manual review.
`;
}

// ==================================================
// VALIDATE AI REVIEW
// ==================================================

function validateReview({
  review,
  questions,
}) {
  if (
    !review ||
    !Array.isArray(
      review.questions
    )
  ) {
    throw new Error(
      "Reviewer did not return a valid questions array."
    );
  }

  if (
    review.questions.length !==
    questions.length
  ) {
    throw new Error(
      `Reviewer returned ${review.questions.length} question reviews for ${questions.length} questions.`
    );
  }

  for (
    let i = 0;
    i < questions.length;
    i++
  ) {
    const expectedNumber =
      i + 1;

    const questionReview =
      review.questions.find(
        (item) =>
          item.question_number ===
          expectedNumber
      );

    if (!questionReview) {
      throw new Error(
        `Reviewer omitted question ${expectedNumber}.`
      );
    }

    if (
      questionReview.status ===
        "approved" &&
      questionReview.issues.length >
        0
    ) {
      throw new Error(
        `Reviewer approved question ${expectedNumber} but also reported issues.`
      );
    }
  }

  const nonApproved =
    review.questions.filter(
      (item) =>
        item.status !==
        "approved"
    );

  if (
    review.application_status ===
      "approved" &&
    nonApproved.length > 0
  ) {
    throw new Error(
      "Reviewer approved the application even though at least one question requires manual review."
    );
  }

  if (
    review.application_status ===
      "approved" &&
    review.application_issues
      .length > 0
  ) {
    throw new Error(
      "Reviewer approved the application while reporting application-level issues."
    );
  }
}

// ==================================================
// REVIEW APPLICATION
// ==================================================

async function reviewApplication({
  questions,
  results,
  vacancy,
}) {
  console.log(
    "\nRunning deterministic safety checks..."
  );

  const deterministicIssues =
    runDeterministicChecks({
      questions,
      results,
    });

  if (
    deterministicIssues.length >
    0
  ) {
    return {
      applicationStatus:
        "manual_review",

      summary:
        "Deterministic checks failed.",

      questions: [],

      applicationIssues:
        deterministicIssues,

      model: null,

      stage:
        "deterministic",
    };
  }

  console.log(
    "Deterministic checks passed."
  );

  console.log(
    "Sending application to independent AI reviewer..."
  );

  const response =
    await openai.responses.create({
      model: MODEL,

      reasoning: {
        effort: "low",
      },

      instructions:
        REVIEWER_INSTRUCTIONS,

      input:
        buildReviewPrompt({
          questions,
          results,
          vacancy,
        }),

      text: {
        format: {
          type:
            "json_schema",

          name:
            "apprenticeship_application_review",

          strict: true,

          schema:
            REVIEW_SCHEMA,
        },
      },
    });

  if (
    !response.output_text
  ) {
    throw new Error(
      "AI reviewer returned no output."
    );
  }

  let parsed;

  try {
    parsed =
      JSON.parse(
        response.output_text
      );
  } catch (error) {
    throw new Error(
      `Could not parse AI review: ${error.message}`
    );
  }

  validateReview({
    review: parsed,
    questions,
  });

  return {
    applicationStatus:
      parsed.application_status,

    summary:
      parsed.summary,

    questions:
      parsed.questions.map(
        (item) => ({
          questionNumber:
            item.question_number,

          status:
            item.status,

          issues:
            item.issues,
        })
      ),

    applicationIssues:
      parsed.application_issues,

    model: MODEL,

    stage: "ai_review",
  };
}

// ==================================================
// PRINT REVIEW
// ==================================================

function printReview(review) {
  console.log(
    "\n========================================"
  );

  console.log(
    "INDEPENDENT APPLICATION REVIEW"
  );

  console.log(
    "========================================"
  );

  console.log(
    `\nAPPLICATION STATUS: ${review.applicationStatus.toUpperCase()}`
  );

  console.log(
    `\nSUMMARY:\n${review.summary}`
  );

  if (
    review.questions.length >
    0
  ) {
    for (
      const question of
      review.questions
    ) {
      console.log(
        `\nQUESTION ${question.questionNumber}: ${question.status.toUpperCase()}`
      );

      if (
        question.issues.length ===
        0
      ) {
        console.log(
          "No issues found."
        );
      } else {
        for (
          const issue of
          question.issues
        ) {
          console.log(
            `- ${issue}`
          );
        }
      }
    }
  }

  if (
    review.applicationIssues
      .length > 0
  ) {
    console.log(
      "\nAPPLICATION-LEVEL ISSUES:"
    );

    for (
      const issue of
      review.applicationIssues
    ) {
      console.log(
        `- ${issue}`
      );
    }
  }

  console.log(
    "\n========================================"
  );
}

// ==================================================
// EXPORTS
// ==================================================

module.exports = {
  reviewApplication,
  printReview,
  runDeterministicChecks,
};