require("dotenv").config();

const OpenAI = require("openai");
const profile = require("./profile");

// ==================================================
// OPENAI CLIENT
// ==================================================

if (!process.env.OPENAI_API_KEY) {
  throw new Error(
    "OPENAI_API_KEY is missing from the .env file."
  );
}

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// ==================================================
// SETTINGS
// ==================================================

const MODEL = "gpt-5.6-luna";
const MAX_WORDS = 300;

// ==================================================
// WORD COUNT
// ==================================================

function countWords(text) {
  if (!text || !text.trim()) {
    return 0;
  }

  return text
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .length;
}

// ==================================================
// STRIP HTML
// ==================================================

function stripHtml(value) {
  if (!value) {
    return "";
  }

  return String(value)
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n")
    .replace(/<\/li>/gi, "\n")
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/\r/g, "")
    .replace(/[ \t]+/g, " ")
    .replace(/\n\s+/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

// ==================================================
// NORMALISE ADDRESSES
// ==================================================

function normaliseAddresses(addresses) {
  if (!Array.isArray(addresses)) {
    return [];
  }

  return addresses.map(
    (address) => ({
      addressLine1:
        address.addressLine1 || "",

      addressLine2:
        address.addressLine2 || "",

      addressLine3:
        address.addressLine3 || "",

      postcode:
        address.postcode || "",
    })
  );
}

// ==================================================
// NORMALISE VACANCY
// ==================================================

function normaliseVacancy(
  vacancy = {}
) {
  return {
    vacancyReference:
      vacancy.vacancyReference || "",

    title:
      vacancy.title ||
      vacancy.vacancyTitle ||
      "",

    employer:
      vacancy.employerName ||
      vacancy.employer ||
      "",

    employerDescription:
      stripHtml(
        vacancy.employerDescription
      ),

    description:
      stripHtml(
        vacancy.description ||
        vacancy.vacancyDescription
      ),

    duties:
      stripHtml(
        vacancy.fullDescription
      ),

    trainingDescription:
      stripHtml(
        vacancy.trainingDescription
      ),

    outcomeDescription:
      stripHtml(
        vacancy.outcomeDescription
      ),

    thingsToConsider:
      stripHtml(
        vacancy.thingsToConsider
      ),

    companyBenefitsInformation:
      stripHtml(
        vacancy.companyBenefitsInformation
      ),

    addresses:
      normaliseAddresses(
        vacancy.addresses
      ),

    course:
      vacancy.course
        ? {
            title:
              vacancy.course.title ||
              "",

            level:
              vacancy.course.level ||
              null,

            route:
              vacancy.course.route ||
              "",

            type:
              vacancy.course.type ||
              "",
          }
        : null,

    apprenticeshipLevel:
      vacancy.apprenticeshipLevel ||
      "",

    provider:
      vacancy.providerName || "",

    skills:
      Array.isArray(
        vacancy.skills
      )
        ? vacancy.skills
        : [],

    qualifications:
      Array.isArray(
        vacancy.qualifications
      )
        ? vacancy.qualifications
        : [],

    wage:
      vacancy.wage || null,

    hoursPerWeek:
      vacancy.hoursPerWeek ||
      null,

    expectedDuration:
      vacancy.expectedDuration ||
      "",

    numberOfPositions:
      vacancy.numberOfPositions ||
      null,

    startDate:
      vacancy.startDate || "",

    closingDate:
      vacancy.closingDate || "",
  };
}

// ==================================================
// SYSTEM INSTRUCTIONS
// ==================================================

const SYSTEM_INSTRUCTIONS = `
You write UK apprenticeship application answers.

You receive:

1. A verified applicant profile
2. Full vacancy information
3. Every written question for one application

Generate ALL answers together.

The applicant profile and vacancy information are the
only factual sources you may use.

==================================================
TRUTHFULNESS
==================================================

Never invent:

- employment
- qualifications
- grades
- responsibilities
- achievements
- technical experience
- projects
- licences
- transport arrangements
- employer facts
- personal circumstances

Never upgrade an interest into experience.

For example:

GOOD:
"I am interested in developing my knowledge of PLCs."

BAD:
"I have experience programming PLCs."

unless the verified profile establishes that
experience.

Do not claim professional engineering, electrical,
mechanical, welding, PLC, CNC, machining or automation
experience unless explicitly supported by the profile.

If a question genuinely cannot be answered from the
available information, mark it for manual review.

==================================================
FACTUAL PRECISION
==================================================

Do not infer an outcome merely because the applicant
performed an action.

For example, if the profile says:

"Checked the cog and chute"

you may say:

"I checked the cog and chute."

Do NOT turn this into:

"I checked the cog and chute and confirmed there was
no further damage."

unless that result is explicitly supported.

Similarly, if the profile says:

"Tested the machine to make sure it was working
correctly"

you may say:

"I tested the machine to make sure it was working
correctly."

Do NOT change this into unsupported outcomes such as:

- "I returned the machine to service."
- "The machine was successfully returned to use."
- "I confirmed there was no damage."
- "The repair permanently resolved the fault."

Preserve the distinction between:

- what the applicant did;
- why they did it;
- and what the verified evidence says happened.

Do not add a successful outcome simply because one
would normally be expected.

Do not strengthen uncertain or limited evidence into a
more definite claim.

When describing an example from the verified profile,
stay as close as reasonably possible to the facts that
are actually recorded.

==================================================
NO INVENTED PROCESS STEPS
==================================================

When using a concrete example from the applicant
profile, do not add plausible-sounding actions that are
not explicitly supported.

You may naturally paraphrase a verified action, but you
must not introduce an additional action or process
step.

For example, if the verified example says the
applicant:

- investigated a fault methodically;
- dismantled the relevant mechanism;
- found a blockage;
- removed the blockage;
- checked the cog and chute;
- reassembled the mechanism;
- reset the machine;
- tested the machine;

then restrict the factual description of what the
applicant DID to those supported actions.

Do NOT embellish the example with unsupported actions
such as:

- "I kept track of each stage."
- "I documented each step."
- "I recorded my findings."
- "I double-checked every component."
- "I inspected the rest of the machine."
- "I followed the manufacturer's procedure."
- "I followed the technical manual."
- "I carried out a safety inspection."
- "I reported the fault to my manager."
- "I asked a colleague for advice."
- "I isolated the power supply."
- "I replaced damaged components."
- "I carried out preventative maintenance."

unless the verified profile explicitly supports that
specific action.

Do not add an action simply because it would be normal,
sensible, safe or professional in that situation.

This rule is especially important for questions asking
the applicant to describe a specific example.

For a specific example, factual accuracy is more
important than making the story sound more impressive.

You MAY explain what a supported example demonstrates.

For example:

"The experience showed my problem-solving skills and
the importance of approaching faults methodically."

That is an interpretation of the verified example.

But do not create a new event or action in order to
demonstrate a skill.

==================================================
ARCADE MACHINE EXAMPLE
==================================================

If using the verified Easter Egg Party machine example,
the supported factual sequence is:

1. The machine developed an Error 18 fault.
2. The applicant investigated the problem methodically.
3. The applicant opened and dismantled the relevant
   part of the mechanism.
4. The applicant found a broken capsule containing a
   prize and tickets lodged in the mechanism and
   causing a blockage.
5. The applicant removed the blockage.
6. The applicant checked the cog and chute.
7. The applicant reassembled the mechanism.
8. The applicant reset the machine.
9. The applicant tested the machine to make sure it
   was working correctly.

Do not add any other repair action or outcome unless it
is independently supported elsewhere in the verified
profile.

==================================================
DRIVING / LOCATION / COMMUTING
==================================================

The applicant's home address is already provided
elsewhere in the application.

Do not unnecessarily repeat their home town or address.

The applicant does not currently have a driving
licence.

Treat this as a factual constraint.

Do NOT volunteer or highlight the lack of a driving
licence unless:

- the employer specifically asks about a licence;
- the employer specifically asks about access to a car;
- the vacancy explicitly requires driving or a licence;
- or it is necessary to answer truthfully.

Never claim the applicant drives.

Never claim the applicant owns or has access to a car.

The applicant is willing to relocate for the right
apprenticeship.

For a commuting question, consider the vacancy's
actual workplace address.

If the workplace is sufficiently far away that
relocation is the sensible answer, it is acceptable to
state clearly that the applicant plans to relocate for
the apprenticeship.

Do not invent:

- train routes
- bus routes
- journey times
- distances
- accommodation already arranged
- vehicle access
- specific transport connections

The applicant may state that they would arrange
suitable accommodation or local travel before the
apprenticeship starts.

Do not change that into a claim that accommodation or
transport has already been arranged.

If answering requires unsupported transport details,
mark the question for manual review.

==================================================
ANSWER QUALITY
==================================================

Use British English.

Write naturally in first person.

Sound like a genuine apprenticeship applicant.

Be confident without exaggerating.

Answer the exact question.

Prefer specific evidence over generic statements.

Do not use headings or bullet points unless the
question asks for them.

Avoid corporate language, clichés and excessive
buzzwords.

Do not repeatedly use phrases such as:

- "I am particularly interested"
- "This apprenticeship stands out to me"
- "I am passionate about"
- "I believe I would be a great fit"

Every answer must contain no more than 300 words.

Usually aim for approximately 100-220 words when the
question warrants a developed answer.

Simple questions should be shorter.

==================================================
TAILORING
==================================================

Use the supplied vacancy information extensively when
it is relevant.

This can include:

- actual job duties
- machinery
- technologies
- engineering processes
- training
- apprenticeship standard
- desired skills
- qualifications
- workplace environment
- employer's actual products or activities
- progression information

Do not merely insert the employer name into a generic
answer.

Do not claim knowledge about the employer beyond the
supplied vacancy information.

==================================================
USING EXAMPLES ACROSS THE APPLICATION
==================================================

Consider ALL questions before writing any answers.

Distribute evidence intelligently.

Avoid telling the same detailed story multiple times.

If a later question explicitly asks for an example of
fixing, assembling or building something, preserve the
strongest detailed practical example for that question.

The arcade-machine fault example can support:

- practical problem solving
- maintenance
- fault finding
- logical investigation

The smart-contract testing work can support:

- analytical thinking
- software testing
- attention to detail
- systematic testing
- quality assurance

Costa Coffee and arcade work can support:

- teamwork
- communication
- responsibility
- customer service
- working under pressure

The Arduino traffic-light project can support genuine
beginner interest in electronics and control systems.

Do not force an example into an answer simply because
it exists in the profile.

==================================================
SKILLS AND STRENGTHS
==================================================

For skills-and-strengths questions:

- identify what this vacancy actually values;
- select the applicant's strongest matching skills;
- support important claims with evidence;
- do not simply list every strength;
- preserve detailed examples for later questions where
  appropriate.

==================================================
MOTIVATION
==================================================

For questions asking why the apprenticeship is
interesting:

Focus on what is genuinely distinctive about THIS
vacancy.

Use actual supplied duties and training.

Connect those duties to the applicant's genuine
interests and transferable experience.

Do not fabricate prior experience performing the
vacancy's specialist duties.

It is valid to say the applicant wants to LEARN
something that the vacancy teaches.

==================================================
QUALIFICATIONS
==================================================

Do not claim that the applicant meets an essential
qualification unless the verified profile supports it.

Do not alter grades.

Do not invent missing subjects.

==================================================
MANUAL REVIEW
==================================================

Set status to "manual_review" when answering would
require an unsupported fact, preference or decision.

Give a short reason in review_reason.

Do not invent an answer merely to avoid manual review.

Normal answer:

status = "ready"
review_reason = ""

Manual review:

status = "manual_review"
answer = ""
review_reason = a short explanation
`;

// ==================================================
// STRUCTURED OUTPUT SCHEMA
// ==================================================

const ANSWER_SCHEMA = {
  type: "object",

  properties: {
    answers: {
      type: "array",

      items: {
        type: "object",

        properties: {
          question_number: {
            type: "integer",
          },

          question: {
            type: "string",
          },

          status: {
            type: "string",

            enum: [
              "ready",
              "manual_review",
            ],
          },

          answer: {
            type: "string",
          },

          review_reason: {
            type: "string",
          },
        },

        required: [
          "question_number",
          "question",
          "status",
          "answer",
          "review_reason",
        ],

        additionalProperties:
          false,
      },
    },
  },

  required: [
    "answers",
  ],

  additionalProperties:
    false,
};

// ==================================================
// BUILD APPLICATION PROMPT
// ==================================================

function buildApplicationPrompt({
  questions,
  vacancy,
}) {
  const numberedQuestions =
    questions.map(
      (
        question,
        index
      ) => ({
        question_number:
          index + 1,

        question,
      })
    );

  return `
==================================================
VACANCY INFORMATION
==================================================

${JSON.stringify(
  normaliseVacancy(vacancy),
  null,
  2
)}

==================================================
VERIFIED APPLICANT PROFILE
==================================================

${JSON.stringify(
  profile,
  null,
  2
)}

==================================================
APPLICATION QUESTIONS
==================================================

${JSON.stringify(
  numberedQuestions,
  null,
  2
)}

==================================================
TASK
==================================================

Generate every answer for this application in ONE
pass.

There must be exactly one result for every supplied
question.

Preserve each question_number.

Every ready answer must contain no more than
${MAX_WORDS} words.

Consider the whole application before writing so that
examples are distributed intelligently rather than
unnecessarily repeated.

Tailor the answers to the actual vacancy information.

Do not infer additional outcomes from the applicant's
actions.

Only state outcomes that are explicitly supported by
the verified profile.

When describing a specific event, do not add plausible
process steps that are absent from the verified
profile.

For the arcade-machine example in particular, use only
the factual repair sequence explicitly supplied in the
profile and system instructions.

You may explain what the verified actions demonstrate,
but do not invent another action to demonstrate a
skill.
`;
}

// ==================================================
// VALIDATE QUESTIONS
// ==================================================

function validateQuestions(
  questions
) {
  if (
    !Array.isArray(
      questions
    )
  ) {
    throw new Error(
      "questions must be an array."
    );
  }

  if (
    questions.length === 0
  ) {
    throw new Error(
      "At least one question is required."
    );
  }

  for (
    let i = 0;
    i < questions.length;
    i++
  ) {
    if (
      typeof questions[i] !==
        "string" ||
      !questions[i].trim()
    ) {
      throw new Error(
        `Question ${i + 1} is empty or invalid.`
      );
    }
  }
}

// ==================================================
// GENERATE APPLICATION ANSWERS
// ==================================================

async function generateApplicationAnswers({
  questions,
  vacancy = {},
}) {
  validateQuestions(
    questions
  );

  console.log(
    `Generating ${questions.length} application answers in ONE API request...`
  );

  const response =
    await openai.responses.create({
      model: MODEL,

      reasoning: {
        effort: "low",
      },

      instructions:
        SYSTEM_INSTRUCTIONS,

      input:
        buildApplicationPrompt({
          questions,
          vacancy,
        }),

      text: {
        format: {
          type:
            "json_schema",

          name:
            "apprenticeship_application_answers",

          strict: true,

          schema:
            ANSWER_SCHEMA,
        },
      },
    });

  if (
    !response.output_text
  ) {
    throw new Error(
      "OpenAI returned no output."
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
      `Could not parse OpenAI response: ${error.message}`
    );
  }

  if (
    !parsed ||
    !Array.isArray(
      parsed.answers
    )
  ) {
    throw new Error(
      "OpenAI response did not contain an answers array."
    );
  }

  // ==================================================
  // EXACTLY ONE RESULT PER QUESTION
  // ==================================================

  if (
    parsed.answers.length !==
    questions.length
  ) {
    throw new Error(
      `Expected ${questions.length} answers but received ${parsed.answers.length}.`
    );
  }

  const results = [];

  // ==================================================
  // VALIDATE RESULTS
  // ==================================================

  for (
    let i = 0;
    i < questions.length;
    i++
  ) {
    const expectedNumber =
      i + 1;

    const generated =
      parsed.answers.find(
        (item) =>
          item.question_number ===
          expectedNumber
      );

    if (!generated) {
      throw new Error(
        `Missing answer for question ${expectedNumber}.`
      );
    }

    const originalQuestion =
      questions[i];

    // ------------------------------------------------
    // MANUAL REVIEW
    // ------------------------------------------------

    if (
      generated.status ===
      "manual_review"
    ) {
      results.push({
        questionNumber:
          expectedNumber,

        question:
          originalQuestion,

        status:
          "manual_review",

        answer: "",

        wordCount: 0,

        reviewReason:
          generated.review_reason ||
          "Manual review required.",

        model: MODEL,
      });

      continue;
    }

    // ------------------------------------------------
    // READY
    // ------------------------------------------------

    const answer =
      String(
        generated.answer ||
        ""
      ).trim();

    if (!answer) {
      throw new Error(
        `Question ${expectedNumber} was marked ready but contained no answer.`
      );
    }

    const wordCount =
      countWords(
        answer
      );

    if (
      wordCount >
      MAX_WORDS
    ) {
      throw new Error(
        `Answer ${expectedNumber} exceeded ${MAX_WORDS} words. Received ${wordCount}.`
      );
    }

    results.push({
      questionNumber:
        expectedNumber,

      question:
        originalQuestion,

      status:
        "ready",

      answer,

      wordCount,

      reviewReason: "",

      model: MODEL,
    });
  }

  return results;
}

// ==================================================
// PRINT PREVIEW
// ==================================================

function printPreview(
  results
) {
  console.log(
    "\n========================================"
  );

  console.log(
    "APPLICATION ANSWER PREVIEW"
  );

  console.log(
    "========================================"
  );

  for (
    const result of
    results
  ) {
    console.log(
      `\nQUESTION ${result.questionNumber}`
    );

    console.log(
      "----------------------------------------"
    );

    console.log(
      result.question
    );

    console.log(
      `\nSTATUS: ${result.status}`
    );

    if (
      result.status ===
      "ready"
    ) {
      console.log(
        `WORDS: ${result.wordCount}/${MAX_WORDS}`
      );

      console.log(
        "\nANSWER:\n"
      );

      console.log(
        result.answer
      );
    } else {
      console.log(
        "\nMANUAL REVIEW REASON:"
      );

      console.log(
        result.reviewReason
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
  generateApplicationAnswers,
  printPreview,
  countWords,
  normaliseVacancy,
};