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
- lean manufacturing
- lean manufacturing operative
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

Career fit must be direct, not merely adjacent, related or transferable.

Do NOT treat a vacancy as a target career merely because it shares some skills, technologies or terminology with a target career.

For example:

- cyber security is not automatically software development, software engineering or software testing;
- IT support is not automatically software development or software testing;
- helpdesk or service desk work is not automatically software development or software testing;
- network support or network installation is not automatically software engineering;
- general IT technician work is not automatically software development or software testing;
- data entry or data administration is not automatically programming or software development;
- generic production or manufacturing work is not automatically manufacturing engineering or lean manufacturing;
- a genuine Lean Manufacturing apprenticeship can qualify when its main occupation and training are specifically centred on lean manufacturing, process improvement, waste reduction, quality, standardised work or continuous improvement in a manufacturing environment;
- packing, assembly, warehouse or general production work does not qualify merely because the employer mentions lean methods;
- a role mentioning testing is not automatically software testing;
- a role mentioning programming is not automatically a software development career if programming is only incidental to the main occupation.

The MAIN occupation, substantial duties and apprenticeship training must genuinely correspond to at least one target career.

"Closely aligned", "related to", "shares skills with", "could lead to", or "has transferable skills for" a target career is NOT sufficient.

If the main occupation is outside the supplied target career list, return "unsuitable".

Reject Armed Forces / military vacancies, including Royal Air Force, RAF, Royal Navy, British Army, Army, Armed Forces, Royal Marines, Ministry of Defence or MOD roles.

==================================================
AUTOMOTIVE / MOTOR VEHICLE EXCLUSION
==================================================

Also reject apprenticeships whose actual role or training is primarily centred on motor vehicles or the automotive industry.

This includes, but is not limited to:

- motor vehicle service and maintenance
- car mechanic roles
- light vehicle technician roles
- vehicle technician roles
- automotive repair
- vehicle diagnostics
- vehicle body repair
- accident repair
- vehicle paint or refinishing
- automotive parts roles
- auto-electrical vehicle repair
- heavy vehicle or HGV technician roles
- bus or coach mechanic roles
- motorcycle technician roles
- other apprenticeships primarily involving the servicing, repair or maintenance of road vehicles

Return "unsuitable" when the apprenticeship itself is genuinely a vehicle or automotive career.

Do NOT reject an otherwise suitable apprenticeship merely because its description mentions:

- access to a vehicle
- travelling in a vehicle
- a company vehicle
- driving between sites
- vehicle access as a requirement

Those references must instead be assessed under the separate driving and vehicle-access rules.

Heavy or mobile plant engineering remains a target career when the work is genuinely centred on industrial, construction, mining, quarrying or similar plant machinery rather than ordinary road vehicles.

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

Apply the decision rules in this exact order.

STEP 1 — CAREER FIT AND EXCLUDED CAREERS

First determine the MAIN occupation represented by the vacancy's actual duties and apprenticeship training.

Determine whether that occupation directly and genuinely fits at least one target career.

Do not pass a vacancy merely because it:

- uses some similar skills;
- uses some of the same technology;
- contains target-career keywords;
- could eventually lead to a target career;
- provides transferable experience;
- is closely related to a target career.

The apprenticeship itself must genuinely be for a target occupation.

A genuine Lean Manufacturing apprenticeship can pass the career-fit test when lean manufacturing is the actual occupation and training focus.

Examples of relevant Lean Manufacturing duties include:

- continuous improvement;
- reducing waste;
- improving manufacturing processes;
- standardised work;
- quality improvement;
- 5S;
- improving productivity, efficiency or workflow.

Do not use this exception for generic factory, warehouse, packing, assembly or production jobs that only mention lean manufacturing incidentally.

Also determine whether the vacancy belongs to an explicitly excluded career category, including Armed Forces / military roles and automotive / motor vehicle roles described above.

If the vacancy belongs to an explicitly excluded career category:

- return "unsuitable";
- do not return "manual_review";
- do not continue evaluating uncertain qualifications, driving requirements or other entry requirements merely to decide the status.

If the actual duties and training do NOT genuinely fit at least one target career:

- return "unsuitable";
- do not return "manual_review";
- do not continue evaluating uncertain qualifications, driving requirements or other entry requirements merely to decide the status.

A vacancy outside the target careers is already unsuitable even if some of its entry requirements cannot be verified.

Do not use "manual_review" to ask whether a non-target career might nevertheless be acceptable.

The target career list and explicit exclusions supplied above are authoritative for this decision.

STEP 2 — CLEARLY FAILED ESSENTIAL REQUIREMENTS

Only if the vacancy passes the career-fit and excluded-career tests, check its explicit essential requirements.

If an explicit essential requirement is clearly contradicted by the verified profile:

- return "unsuitable".

Examples include:

- an essential driving licence when the applicant does not have one;
- essential access to a vehicle when the profile does not establish that access;
- an essential qualification that the verified profile clearly establishes the applicant does not hold.

STEP 3 — UNRESOLVED ESSENTIAL REQUIREMENTS

Only if the vacancy passes the career-fit test, is not an excluded career, and has no clearly failed essential requirement, determine whether any essential requirement cannot safely be verified from the supplied profile.

If an essential requirement cannot reliably be verified:

- return "manual_review";
- identify the unresolved requirement;
- do not guess;
- do not invent qualification equivalencies;
- do not use manual review to reconsider whether an unrelated career should be accepted.

STEP 4 — SUITABLE

Return "suitable" only when:

- the actual role genuinely and directly fits at least one target career;
- the role is not in an explicitly excluded career category;
- there is no explicit essential requirement contradicted by the verified profile; and
- there is no unresolved essential requirement requiring human judgement.

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

Follow the decision order in the system instructions.

First identify the vacancy's MAIN occupation from its actual duties and apprenticeship training.

Then determine whether that occupation DIRECTLY fits one of the supplied target careers.

Do not accept adjacent or merely related careers.

In particular:

- cyber security is not automatically software development, software engineering or software testing;
- generic IT support is not automatically software development or software testing;
- helpdesk and service desk roles are not automatically software careers;
- network installation or network support is not automatically software engineering;
- general production work is not automatically manufacturing engineering or lean manufacturing;
- a genuine Lean Manufacturing apprenticeship can qualify when lean manufacturing and continuous improvement are the actual occupation and training focus;
- generic factory, packing, assembly or warehouse work does not qualify merely because lean terminology appears in the vacancy;
- merely mentioning testing does not make a role software testing.

Reject unrelated careers even if an incidental keyword caused the vacancy to reach this reviewer.

Reject automotive and motor vehicle apprenticeships as instructed, while distinguishing them from otherwise suitable roles that merely mention a vehicle or driving requirement.

Only after direct career fit has been established should unresolved essential entry requirements cause manual review.

Check the real duties and training, not just the title or isolated keywords.

Check all explicit essential requirements against the verified profile.

Treat distance as acceptable because the applicant can travel where necessary and is willing to relocate.

Do not infer a driving licence, vehicle access, qualification, experience or eligibility fact that is not in the profile.

If a genuine target-career vacancy has an essential requirement that is ambiguous or cannot be verified, use manual_review rather than guessing.
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

  if (
    !String(
      parsed.reason || ""
    ).trim()
  ) {
    throw new Error(
      "Vacancy reviewer returned no reason for its decision."
    );
  }

  if (
    !Array.isArray(
      parsed.blocking_requirements
    )
  ) {
    throw new Error(
      "Vacancy reviewer did not return blocking_requirements as an array."
    );
  }

  if (
    !Array.isArray(
      parsed.unresolved_requirements
    )
  ) {
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