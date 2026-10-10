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

The actual occupation, duties and training must genuinely fit a target career.

==================================================
PRIMARY OCCUPATION OVERRIDES THE TRAINING STANDARD
==================================================

This rule is extremely important.

Determine the PRIMARY OCCUPATION from:

1. the vacancy title;
2. the actual day-to-day duties;
3. what the apprentice will spend most of their working time doing.

The apprenticeship standard, course title or training qualification is SUPPORTING EVIDENCE ONLY.

It must NOT override the real occupation.

For example:

A vacancy called:

"Stores/Warehouse Apprentice"

whose duties mainly involve:

- receiving goods;
- checking deliveries;
- storing materials;
- issuing materials;
- stock records;
- inventory;
- stock checks;
- picking;
- packing;
- dispatch;
- material allocation;
- moving materials;
- warehouse operations;
- stores operations;

is a STORES / WAREHOUSE occupation.

It is NOT a target engineering or lean-manufacturing occupation merely because the apprenticeship standard happens to be:

"Lean Manufacturing Operative Level 2".

Such a vacancy must be UNSUITABLE.

Likewise, do not classify these as target careers merely because the vacancy mentions manufacturing, engineering, lean, machinery, software, technology or another target keyword:

- warehouse work;
- stores work;
- stock control;
- inventory work;
- logistics;
- picking and packing;
- dispatch;
- goods-in / goods-out;
- material handling;
- generic repetitive production work;
- generic assembly work;
- generic packing work;
- general operative work.

The PRIMARY OCCUPATION must itself genuinely match a target career.

==================================================
LEAN MANUFACTURING
==================================================

Lean Manufacturing is a target area, but apply a strict test.

A genuine Lean Manufacturing role should substantially involve one or more of:

- continuous improvement;
- process improvement;
- reducing waste;
- improving production processes;
- standardised work;
- quality improvement;
- identifying inefficiencies;
- root-cause problem solving;
- improving productivity;
- manufacturing-process optimisation;
- technical production processes;
- operating or setting manufacturing machinery where this forms genuine technical manufacturing training;
- engineering-related manufacturing skills;
- fabrication;
- machining;
- welding;
- technical manufacturing.

Do NOT accept a vacancy simply because:

- the apprenticeship standard is called Lean Manufacturing Operative;
- "lean manufacturing" appears in the training section;
- the employer is a manufacturer;
- the apprentice works inside a factory;
- the vacancy mentions production.

If the real job is primarily:

- warehouse;
- stores;
- logistics;
- stock handling;
- inventory;
- picking;
- packing;
- dispatch;
- material movement;
- repetitive basic assembly;
- basic packing;
- generic non-technical production;

then it must be UNSUITABLE unless the actual duties independently establish a genuine target technical occupation.

The words "Lean Manufacturing Operative" in the apprenticeship standard are never sufficient by themselves.

==================================================
MANUFACTURING
==================================================

Do not treat all manufacturing or production jobs as target careers.

Manufacturing engineering and genuinely technical manufacturing are target areas.

Examples that may qualify include:

- CNC machining;
- machine setting;
- toolmaking;
- engineering machining;
- welding;
- fabrication;
- production engineering;
- manufacturing engineering;
- technical machine operation;
- maintenance;
- fault finding;
- process engineering;
- technical quality work;
- engineering production;
- technical manufacturing involving drawings, measurements, tolerances, machinery or engineering processes.

Generic production, assembly, packing or factory-operative work is not automatically suitable.

Always inspect the real duties.

==================================================
SOFTWARE / IT
==================================================

Software development and software testing are target careers.

Generic IT support, network support, infrastructure support, cybersecurity or helpdesk work is NOT automatically a target career.

However, a vacancy with a broad IT title may still qualify if its actual core duties genuinely include substantial:

- programming;
- software development;
- writing code;
- debugging;
- software testing;
- application development;
- maintaining or developing software features.

Judge the real occupation and duties rather than the title alone.

Do not treat scripting, monitoring, networking or general IT administration as software development unless the duties genuinely establish software development or software testing as a substantial part of the occupation.

==================================================
AUTOMOTIVE
==================================================

Generic motor vehicle technician, vehicle mechanic or automotive servicing roles are not target careers.

Do not classify them as mechanical engineering merely because they involve mechanical systems.

A genuinely different engineering occupation should only pass if the duties independently establish one of the target engineering careers.

==================================================
MILITARY
==================================================

Reject Armed Forces / military vacancies, including:

- Royal Air Force;
- RAF;
- Royal Navy;
- British Army;
- Army;
- Armed Forces;
- Royal Marines;
- Ministry of Defence;
- MOD roles.

==================================================
ESSENTIAL REQUIREMENTS
==================================================

Check explicit essential entry requirements against the verified profile.

Examples include:

- GCSE subjects and grades;
- A levels;
- degrees;
- vocational qualifications;
- age or eligibility requirements if explicitly stated;
- right-to-work requirements;
- nationality requirements;
- residency requirements;
- driving licence;
- access to a vehicle;
- mandatory prior experience;
- mandatory technical qualifications;
- other clearly stated prerequisites.

If the vacancy explicitly requires something the profile clearly establishes the applicant does not have, status must be "unsuitable".

If the vacancy explicitly requires something and the profile does not contain enough information to determine whether the applicant has it, status must be "manual_review".

Do not treat a preference, desirable criterion, advantage, or "nice to have" as an essential requirement.

Do not reject merely because the applicant lacks prior specialist experience when the vacancy is designed to teach that skill and does not explicitly require prior experience.

Do not invent equivalencies between qualifications unless the vacancy itself clearly accepts an equivalent and the supplied profile supports that equivalence.

==================================================
A-LEVEL REQUIREMENTS
==================================================

The verified profile explicitly contains:

education.aLevels

If this is an empty array, the applicant does NOT hold A levels.

This is known information, not missing information.

Therefore:

If a vacancy explicitly requires an A level or specified A levels as essential and education.aLevels is empty, status must be "unsuitable".

Do NOT use "manual_review" merely because there are no A-level grades to compare.

For example:

Essential:
- Maths A level grade B
- Science A level grade B

Applicant:
- education.aLevels = []

Result:
UNSUITABLE.

Those are known unmet essential requirements.

However, if the vacancy explicitly allows an alternative or equivalent qualification, assess whether the verified profile establishes that accepted alternative.

Do not invent equivalence.

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
- do not invent a route;
- do not invent a journey time;
- do not invent a transport method;
- do not claim accommodation is already arranged.

The verified profile may establish that the applicant can work early or late shifts and can relocate close enough to the workplace.

Use those facts when relevant.

Do not turn willingness to relocate into a claim that relocation has already happened.

If the role requires regular driving as an inherent duty but the wording is unclear about whether a licence is mandatory, use "manual_review".

==================================================
RIGHT TO WORK / NATIONALITY / RESIDENCY
==================================================

Use the verified eligibility section of the applicant profile.

If the profile explicitly establishes:

- permanent right to work in the UK;
- continuous UK residence for at least the last five years;
- British citizenship from birth;
- no other nationality;

those facts may be used when checking explicit vacancy requirements.

Do not send a vacancy to manual review for one of those facts when the profile already answers it.

However:

Do NOT claim that the applicant already holds BPSS, SC, DV or any other security clearance unless the profile explicitly says that clearance is already held.

Eligibility for security clearance is not the same thing as already holding security clearance.

If the employer says the successful applicant will need to undergo or obtain clearance, do not reject merely because the applicant does not already hold it unless the vacancy explicitly requires existing clearance.

==================================================
QUALIFICATIONS
==================================================

Use the exact subjects, qualification types and grades in the verified profile.

Do not raise grades.

Do not invent missing subjects.

Do not assume the applicant has a degree, licence or qualification unless the profile says so.

Remember that education.aLevels = [] explicitly means the applicant has no A levels.

If an essential qualification threshold is clearly met, that requirement passes.

If an essential qualification threshold is clearly not met, status must be "unsuitable".

If the requirement genuinely cannot be reliably compared with the supplied profile, use "manual_review".

==================================================
CAREER-MATCH DECISION ORDER
==================================================

Use this order:

STEP 1:
Identify the primary occupation from the title and actual duties.

STEP 2:
Ignore incidental target-career keywords.

STEP 3:
Treat the apprenticeship standard/course as supporting evidence, not decisive evidence.

STEP 4:
Decide whether the primary occupation itself genuinely fits a target career.

STEP 5:
If it does not, return "unsuitable".

STEP 6:
If it does, check all essential requirements against the verified applicant profile.

STEP 7:
If an essential requirement is known not to be met, return "unsuitable".

STEP 8:
If an essential requirement genuinely cannot be determined from the supplied information, return "manual_review".

STEP 9:
Only return "suitable" when the career match and eligibility requirements are both established.

==================================================
DECISION
==================================================

Return "suitable" only when:

- the PRIMARY OCCUPATION genuinely fits at least one target career;
- the match is supported by the actual duties;
- the match does not depend merely on an apprenticeship standard or isolated keyword;
- there is no explicit essential requirement contradicted by the verified profile; and
- there is no unresolved essential requirement requiring human judgement.

Return "unsuitable" when:

- the primary occupation does not genuinely fit a target career; OR
- there is a clear factual reason the applicant cannot meet an essential requirement.

When career mismatch is the reason for "unsuitable", put that mismatch in blocking_requirements.

Return "manual_review" only when suitability cannot safely be established from the supplied information.

Do NOT use manual_review for information that the verified profile already explicitly answers.

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

function getVacancyTitle(vacancy = {}) {
  return String(
    vacancy.title ||
    vacancy.vacancyTitle ||
    vacancy.vacancyTitleText ||
    ""
  )
    .replace(/\s+/g, " ")
    .trim();
}

function getDeterministicCareerExclusion(vacancy = {}) {
  const title = getVacancyTitle(vacancy).toLowerCase();

  /*
   * These exclusions deliberately inspect the TITLE rather than
   * searching the entire vacancy text.
   *
   * A genuine maintenance engineer might legitimately visit a
   * "stores" area or handle spare parts, so incidental words in
   * the duties must not cause automatic rejection.
   *
   * But when the vacancy itself is explicitly titled as a
   * warehouse/stores/logistics occupation, the primary occupation
   * is sufficiently clear to reject before asking the model.
   */

  const excludedPrimaryOccupations = [
    {
      pattern: /\bwarehouse\b/i,
      reason:
        "The vacancy title identifies the primary occupation as warehouse work rather than a target technical career.",
    },

    {
      pattern: /\bstores?\s*(?:\/|&|and|-)?\s*warehouse\b/i,
      reason:
        "The vacancy title identifies the primary occupation as stores/warehouse work rather than a target technical career.",
    },

    {
      pattern: /\bwarehouse\s*(?:\/|&|and|-)?\s*stores?\b/i,
      reason:
        "The vacancy title identifies the primary occupation as warehouse/stores work rather than a target technical career.",
    },

    {
      pattern: /\bstores?\s+apprentice\b/i,
      reason:
        "The vacancy title identifies the primary occupation as stores work rather than a target technical career.",
    },

    {
      pattern: /\blogistics\s+apprentice\b/i,
      reason:
        "The vacancy title identifies the primary occupation as logistics rather than a target technical career.",
    },

    {
      pattern: /\bstock\s+(?:control|controller|operative|assistant|apprentice)\b/i,
      reason:
        "The vacancy title identifies the primary occupation as stock/inventory work rather than a target technical career.",
    },

    {
      pattern: /\binventory\s+(?:operative|assistant|controller|apprentice)\b/i,
      reason:
        "The vacancy title identifies the primary occupation as inventory work rather than a target technical career.",
    },

    {
      pattern: /\bpick(?:er|ing)\s*(?:\/|&|and|-)?\s*pack(?:er|ing)\b/i,
      reason:
        "The vacancy title identifies the primary occupation as picking/packing rather than a target technical career.",
    },
  ];

  for (const exclusion of excludedPrimaryOccupations) {
    if (exclusion.pattern.test(title)) {
      return exclusion.reason;
    }
  }

  return null;
}

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

FIRST identify the real primary occupation from the title and majority of the duties.

The actual occupation and duties have priority over the apprenticeship standard or course title.

Do not accept warehouse, stores, logistics, stock, inventory, picking, packing, dispatch or generic production work merely because the apprenticeship standard contains words such as "Lean Manufacturing Operative".

For Lean Manufacturing, require the actual duties to establish genuine technical manufacturing, continuous improvement, process improvement, quality improvement, waste reduction, standardised work, technical machinery/process work or another genuine target technical occupation.

Check all explicit essential requirements against the verified profile.

Treat education.aLevels = [] as explicit confirmation that the applicant has no A levels.

Treat distance as acceptable because the applicant can travel where necessary and is willing to relocate.

Use verified shift-availability information when relevant.

Use verified right-to-work, nationality and residency information when relevant.

Do not infer that the applicant already holds security clearance.

Do not infer a driving licence, vehicle access, qualification, experience or eligibility fact that is not in the profile.

If an essential requirement is genuinely ambiguous or cannot be verified, use manual_review rather than guessing.

Do not use manual_review when the profile already explicitly establishes that a requirement is not met; in that situation use unsuitable.
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

  /*
   * Handle occupations where the title itself establishes that
   * the primary job is outside the target careers.
   *
   * This also protects against a model over-weighting an
   * apprenticeship standard such as Lean Manufacturing Operative.
   */
  const deterministicExclusion =
    getDeterministicCareerExclusion(vacancy);

  if (deterministicExclusion) {
    return {
      status: "unsuitable",

      careerMatch:
        "No direct match to the supplied target careers",

      reason:
        deterministicExclusion,

      blockingRequirements: [
        deterministicExclusion,
      ],

      unresolvedRequirements: [],

      model:
        "deterministic-primary-occupation-check",
    };
  }

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