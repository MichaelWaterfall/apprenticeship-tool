require("dotenv").config();

const OpenAI = require("openai");

const profile = require("./profile");

const {
  normaliseVacancy,
} = require("./answerGenerator");

if (!process.env.OPENAI_API_KEY) {
  throw new Error(
    "OPENAI_API_KEY is missing from the .env file."
  );
}

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const MODEL = "gpt-5.6-luna";

const SYSTEM_INSTRUCTIONS = `
You assess whether a UK apprenticeship vacancy is suitable for a verified applicant BEFORE an application is opened.

You receive:

1. A verified applicant profile
2. Full vacancy information

Use only those two sources.

Do not invent facts about the applicant, employer, vacancy, location, transport, qualifications or eligibility.

==================================================
TARGET CAREERS
==================================================

The applicant wants apprenticeships genuinely centred on one or more of these areas:

- engineering
- engineering maintenance
- mechatronics
- electromechanical engineering
- automation
- controls
- PLCs
- instrumentation
- electrical engineering
- electronics
- mechanical engineering
- manufacturing engineering
- CNC
- machining
- welding
- fabrication
- building services engineering
- BMS
- HVAC
- refrigeration
- lift engineering
- plant engineering or plant maintenance
- fire and security engineering
- civil engineering
- oil and gas technical roles
- offshore technical roles
- subsea technical roles
- drilling technical roles
- process technician roles
- mining
- quarrying
- mineral processing
- heavy or mobile plant technical roles
- software development
- software engineering
- programming
- web or application development
- software testing
- QA / software quality assurance
- test engineering
- test analysis

A keyword appearing incidentally is not enough.
The actual apprenticeship duties and training must genuinely fit a target career.

Reject Armed Forces / military vacancies, including Royal Air Force, RAF, Royal Navy, British Army, Army, Armed Forces, Royal Marines, Ministry of Defence or MOD roles.

==================================================
ESSENTIAL REQUIREMENTS
==================================================

Check explicit essential entry requirements against the verified profile.

Examples include:

- GCSE subjects and grades
- A levels
- degrees
- vocational qualifications
- age or eligibility requirements if explicitly stated
- driving licence
- access to a vehicle
- mandatory prior experience
- mandatory technical qualifications
- other clearly stated prerequisites

If the vacancy explicitly requires something the profile clearly establishes the applicant does not have, status must be "unsuitable".

If the vacancy explicitly requires something and the profile does not contain enough information to determine whether the applicant has it, status must be "manual_review".

Do not treat a preference, desirable criterion, advantage, or "nice to have" as an essential requirement.

Do not reject merely because the applicant lacks prior specialist experience when the vacancy is designed to teach that skill and does not explicitly require prior experience.

Do not invent equivalencies between qualifications unless the vacancy itself clearly accepts an equivalent and the supplied profile supports that equivalence.

==================================================
DRIVING / LOCATION / TRAVEL
==================================================

The applicant does not currently have a driving licence.
Do not claim that they drive or have access to a car.

If a driving licence is explicitly essential or required, status must be "unsuitable".

If access to a car or suitable vehicle is explicitly essential or required, status must be "unsuitable" unless the verified profile explicitly establishes that access.

If driving is only desirable or preferred, do not automatically reject the vacancy.

The applicant can travel to any location necessary for an apprenticeship and is willing to relocate for the right apprenticeship.

Therefore:

- do not reject because of distance;
- do not reject because the workplace is outside the applicant's current area;
- do not invent a route, journey time, transport method or accommodation arrangement.

If the role requires regular driving as an inherent duty but the wording is unclear about whether a licence is mandatory, use "manual_review".

==================================================
QUALIFICATIONS
==================================================

Use the exact subjects, qualification types and grades in the verified profile.

Do not raise grades.
Do not invent missing subjects.
Do not assume the applicant has A levels, a degree, a licence or another qualification unless the profile says so.

If an essential qualification threshold is clearly met, that requirement passes.

If an essential qualification threshold is clearly not met, status must be "unsuitable".

If the requirement cannot be reliably compared with the supplied profile, use "manual_review".

==================================================
DECISION
==================================================

Return "suitable" only when:

- the actual role genuinely fits at least one target career;
- there is no explicit essential requirement contradicted by the verified profile; and
- there is no unresolved essential requirement requiring human judgement.

Return "unsuitable" when there is a clear factual reason not to apply automatically.

Return "manual_review" when suitability cannot be established safely from the supplied information.

Keep reasons concise and factual.
Do not rank vacancies.
Do not write an application answer.
`;

const REVIEW_SCHEMA = {
  type: "object",

  properties: {
    status: {
      type: "string",
      enum: [
        "suitable",
        "unsuitable",
        "manual_review",
      ],
    },

    career_match: {
      type: "string",
    },

    reason: {
      type: "string",
    },

    blocking_requirements: {
      type: "array",
      items: {
        type: "string",
      },
    },

    unresolved_requirements: {
      type: "array",
      items: {
        type: "string",
      },
    },
  },

  required: [
    "status",
    "career_match",
    "reason",
    "blocking_requirements",
    "unresolved_requirements",
  ],

  additionalProperties: false,
};

function buildVacancyReviewPrompt(vacancy) {
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
TASK
==================================================

Decide whether this vacancy is safe and suitable to pass to the automatic application system.

Check the real duties and training, not just the title or isolated keywords.

Check all explicit essential requirements against the verified profile.

Treat distance as acceptable because the applicant can travel where necessary and is willing to relocate.

Do not infer a driving licence, vehicle access, qualification, experience or eligibility fact that is not in the profile.

If an essential requirement is ambiguous or cannot be verified, use manual_review rather than guessing.
`;
}

function validateReview(parsed) {
  if (!parsed || typeof parsed !== "object") {
    throw new Error(
      "Vacancy reviewer returned an invalid result."
    );
  }

  if (
    ![
      "suitable",
      "unsuitable",
      "manual_review",
    ].includes(parsed.status)
  ) {
    throw new Error(
      `Vacancy reviewer returned invalid status: ${parsed.status}`
    );
  }

  if (!Array.isArray(parsed.blocking_requirements)) {
    throw new Error(
      "Vacancy reviewer did not return blocking_requirements as an array."
    );
  }

  if (!Array.isArray(parsed.unresolved_requirements)) {
    throw new Error(
      "Vacancy reviewer did not return unresolved_requirements as an array."
    );
  }

  if (
    parsed.status === "suitable" &&
    (
      parsed.blocking_requirements.length > 0 ||
      parsed.unresolved_requirements.length > 0
    )
  ) {
    throw new Error(
      "Vacancy reviewer marked the vacancy suitable while also reporting blocking or unresolved requirements."
    );
  }

  if (
    parsed.status === "unsuitable" &&
    parsed.blocking_requirements.length === 0
  ) {
    throw new Error(
      "Vacancy reviewer marked the vacancy unsuitable without identifying a blocking requirement."
    );
  }

  if (
    parsed.status === "manual_review" &&
    parsed.unresolved_requirements.length === 0
  ) {
    throw new Error(
      "Vacancy reviewer requested manual review without identifying an unresolved requirement."
    );
  }
}

async function reviewVacancySuitability(vacancy = {}) {
  console.log(
    "Reviewing vacancy suitability..."
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
        buildVacancyReviewPrompt(
          vacancy
        ),

      text: {
        format: {
          type: "json_schema",

          name:
            "apprenticeship_vacancy_suitability",

          strict: true,

          schema:
            REVIEW_SCHEMA,
        },
      },
    });

  if (!response.output_text) {
    throw new Error(
      "OpenAI returned no vacancy suitability output."
    );
  }

  let parsed;

  try {
    parsed = JSON.parse(
      response.output_text
    );
  } catch (error) {
    throw new Error(
      `Could not parse vacancy suitability response: ${error.message}`
    );
  }

  validateReview(parsed);

  return {
    status:
      parsed.status,

    careerMatch:
      String(
        parsed.career_match || ""
      ).trim(),

    reason:
      String(
        parsed.reason || ""
      ).trim(),

    blockingRequirements:
      parsed.blocking_requirements,

    unresolvedRequirements:
      parsed.unresolved_requirements,

    model:
      MODEL,
  };
}

function printVacancyReview(review) {
  console.log(
    "\nVACANCY SUITABILITY REVIEW"
  );

  console.log(
    "----------------------------------------"
  );

  console.log(
    `Status: ${review.status.toUpperCase()}`
  );

  if (review.careerMatch) {
    console.log(
      `Career match: ${review.careerMatch}`
    );
  }

  if (review.reason) {
    console.log(
      `Reason: ${review.reason}`
    );
  }

  if (
    review.blockingRequirements.length > 0
  ) {
    console.log(
      "Blocking requirements:"
    );

    for (
      const requirement
      of review.blockingRequirements
    ) {
      console.log(
        `- ${requirement}`
      );
    }
  }

  if (
    review.unresolvedRequirements.length > 0
  ) {
    console.log(
      "Unresolved requirements:"
    );

    for (
      const requirement
      of review.unresolvedRequirements
    ) {
      console.log(
        `- ${requirement}`
      );
    }
  }
}

module.exports = {
  reviewVacancySuitability,
  printVacancyReview,
};