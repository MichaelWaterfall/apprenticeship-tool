require("dotenv").config();

const fs = require("fs");
const path = require("path");

const {
  getAllVacancies,
  matchesCareer,
  isExcluded,
} = require("./finder");

const {
  fillApplication,
  normaliseVacancyReference,
  getSubmissionRecord,
} = require("./applicants/govuk");

const BULK_LOG_FILE = path.join(
  __dirname,
  "..",
  "data",
  "bulk-run-log.json"
);

const DEFAULT_LIMIT = 1;

// ==================================================
// BULK LOG
// ==================================================

function readBulkLog() {
  if (!fs.existsSync(BULK_LOG_FILE)) {
    return [];
  }

  try {
    const parsed = JSON.parse(
      fs.readFileSync(
        BULK_LOG_FILE,
        "utf8"
      )
    );

    return Array.isArray(parsed)
      ? parsed
      : [];
  } catch (error) {
    throw new Error(
      `Could not read bulk run log: ${error.message}`
    );
  }
}

function writeBulkLog(records) {
  fs.mkdirSync(
    path.dirname(BULK_LOG_FILE),
    {
      recursive: true,
    }
  );

  fs.writeFileSync(
    BULK_LOG_FILE,
    JSON.stringify(
      records,
      null,
      2
    ),
    "utf8"
  );
}

function recordBulkEvent({
  vacancy,
  status,
  details = "",
}) {
  const records =
    readBulkLog();

  records.push({
    vacancyReference:
      normaliseVacancyReference(
        vacancy?.vacancyReference
      ),

    vacancyTitle:
      vacancy?.title || "",

    employerName:
      vacancy?.employerName || "",

    status,

    details,

    timestamp:
      new Date().toISOString(),
  });

  writeBulkLog(records);
}

// ==================================================
// ARGUMENT HELPERS
// ==================================================

function getArgValue(
  args,
  name
) {
  const index =
    args.indexOf(name);

  if (index === -1) {
    return null;
  }

  const value =
    args[index + 1];

  if (
    !value ||
    value.startsWith("--")
  ) {
    throw new Error(
      `${name} requires a value.`
    );
  }

  return value;
}

function parsePositiveInteger(
  value,
  name
) {
  const parsed =
    Number(value);

  if (
    !Number.isInteger(parsed) ||
    parsed < 1
  ) {
    throw new Error(
      `${name} must be a positive whole number.`
    );
  }

  return parsed;
}

function parseOptions(args) {
  const submit =
    args.includes("--submit");

  const all =
    args.includes("--all");

  const limitValue =
    getArgValue(
      args,
      "--limit"
    );

  const startValue =
    getArgValue(
      args,
      "--start"
    );

  const referenceValue =
    getArgValue(
      args,
      "--reference"
    );

  if (
    all &&
    limitValue
  ) {
    throw new Error(
      "Use either --all or --limit, not both."
    );
  }

  return {
    submit,

    all,

    limit:
      all
        ? Infinity
        : limitValue
          ? parsePositiveInteger(
              limitValue,
              "--limit"
            )
          : DEFAULT_LIMIT,

    start:
      startValue
        ? parsePositiveInteger(
            startValue,
            "--start"
          )
        : 1,

    reference:
      referenceValue
        ? normaliseVacancyReference(
            referenceValue
          )
        : null,
  };
}

// ==================================================
// MODE
// ==================================================

function printMode(options) {
  console.log(
    "========================================"
  );

  console.log(
    "BULK APPRENTICESHIP RUNNER"
  );

  console.log(
    "========================================\n"
  );

  console.log(
    `Submission enabled: ${
      options.submit
        ? "YES"
        : "NO"
    }`
  );

  console.log(
    `Vacancy limit: ${
      options.limit === Infinity
        ? "ALL"
        : options.limit
    }`
  );

  console.log(
    `Start position: ${options.start}`
  );

  if (
    options.reference
  ) {
    console.log(
      `Reference filter: ${options.reference}`
    );
  }

  if (
    !options.submit
  ) {
    console.log(
      "\nDRY RUN: applications may be filled and saved, but final Submit will not be clicked."
    );
  } else {
    console.log(
      "\nLIVE MODE: approved native GOV.UK applications can be submitted for real."
    );
  }
}

// ==================================================
// FILTER VACANCIES
// ==================================================

function selectSuitableVacancies(
  allVacancies,
  options
) {
  let suitable =
    allVacancies.filter(
      (vacancy) =>
        matchesCareer(
          vacancy
        ) &&
        !isExcluded(
          vacancy
        )
    );

  if (
    options.reference
  ) {
    suitable =
      suitable.filter(
        (vacancy) =>
          normaliseVacancyReference(
            vacancy.vacancyReference
          ) ===
          options.reference
      );
  }

  return suitable;
}

// ==================================================
// AUTH FAILURE
// ==================================================

function isAuthFailure(error) {
  const message =
    String(
      error?.message || ""
    ).toLowerCase();

  return (
    message.includes(
      "session is signed out"
    ) ||
    message.includes(
      "authentication file not found"
    )
  );
}

// ==================================================
// RESULT
// ==================================================

function summariseResult(result) {
  if (
    !result ||
    !result.status
  ) {
    return "unknown";
  }

  return result.status;
}

// ==================================================
// BULK RUN
// ==================================================

async function runBulkApplications(
  options
) {
  printMode(options);

  // ------------------------------------------------
  // DOWNLOAD API ONCE
  // ------------------------------------------------

  const allVacancies =
    await getAllVacancies();

  // ------------------------------------------------
  // FILTER IN MEMORY
  // ------------------------------------------------

  const suitableVacancies =
    selectSuitableVacancies(
      allVacancies,
      options
    );

  console.log(
    `\nPotentially suitable vacancies after career/exclusion filtering: ${suitableVacancies.length}`
  );

  if (
    suitableVacancies.length ===
    0
  ) {
    console.log(
      "Nothing to process."
    );

    return;
  }

  // ------------------------------------------------
  // START POSITION
  // ------------------------------------------------

  const startIndex =
    options.start - 1;

  const candidates =
    suitableVacancies.slice(
      startIndex
    );

  // ------------------------------------------------
  // SUMMARY
  // ------------------------------------------------

  const summary = {
    considered: 0,
    processed: 0,
    submitted: 0,
    readyToSubmit: 0,
    manualReview: 0,
    externalApplication: 0,
    alreadySubmitted: 0,
    errors: 0,
  };

  let attempted = 0;

  // ------------------------------------------------
  // PROCESS VACANCIES
  // ------------------------------------------------

  for (
    let i = 0;
    i < candidates.length;
    i++
  ) {
    if (
      attempted >=
      options.limit
    ) {
      break;
    }

    const vacancy =
      candidates[i];

    const reference =
      normaliseVacancyReference(
        vacancy.vacancyReference
      );

    const position =
      startIndex +
      i +
      1;

    summary.considered++;

    console.log(
      "\n\n========================================"
    );

    console.log(
      `VACANCY ${position} OF ${suitableVacancies.length}`
    );

    console.log(
      "========================================"
    );

    console.log(
      `Title: ${
        vacancy.title ||
        "(unknown)"
      }`
    );

    console.log(
      `Employer: ${
        vacancy.employerName ||
        "(unknown)"
      }`
    );

    console.log(
      `Reference: ${
        reference ||
        "(unknown)"
      }`
    );

    // ================================================
    // INVALID REFERENCE
    // ================================================

    if (!reference) {
      console.log(
        "SKIP: vacancy has no usable reference."
      );

      recordBulkEvent({
        vacancy,

        status:
          "invalid_vacancy",

        details:
          "Vacancy had no usable vacancy reference.",
      });

      summary.errors++;

      continue;
    }

    // ================================================
    // DUPLICATE PROTECTION
    // ================================================

    const existingSubmission =
      getSubmissionRecord(
        reference
      );

    if (
      existingSubmission
    ) {
      console.log(
        `SKIP: local application log already contains "${existingSubmission.status}".`
      );

      recordBulkEvent({
        vacancy,

        status:
          "already_submitted",

        details:
          `Existing application-log status: ${existingSubmission.status}`,
      });

      summary.alreadySubmitted++;

      continue;
    }

    // ================================================
    // COUNT THIS AS AN ATTEMPT
    // ================================================

    attempted++;

    summary.processed++;

    recordBulkEvent({
      vacancy,

      status:
        "started",

      details:
        options.submit
          ? "Live bulk application started."
          : "Dry-run bulk application started.",
    });

    // ================================================
    // RUN APPLICATION
    // ================================================

    try {
      const result =
        await fillApplication(
          vacancy,
          {
            submit:
              options.submit,

            interactive:
              false,

            keepOpen:
              false,
          }
        );

      const status =
        summariseResult(
          result
        );

      recordBulkEvent({
        vacancy,

        status,

        details:
          result?.stage
            ? `Stage: ${result.stage}`
            : "",
      });

      // ==============================================
      // RESULT HANDLING
      // ==============================================

      switch (status) {
        case "submitted":
          summary.submitted++;

          console.log(
            "\nRESULT: SUBMITTED"
          );

          break;

        case "ready_to_submit":
          summary.readyToSubmit++;

          console.log(
            "\nRESULT: READY TO SUBMIT (dry run; not submitted)"
          );

          break;

        case "manual_review":
          summary.manualReview++;

          console.log(
            "\nRESULT: MANUAL REVIEW - continuing to next vacancy"
          );

          break;

        case "external_application":
          summary.externalApplication++;

          console.log(
            "\nRESULT: EXTERNAL APPLICATION - skipped"
          );

          break;

        case "already_submitted":
          summary.alreadySubmitted++;

          console.log(
            "\nRESULT: ALREADY SUBMITTED - skipped"
          );

          break;

        default:
          summary.errors++;

          console.log(
            `\nRESULT: UNEXPECTED STATUS "${status}"`
          );

          break;
      }
    } catch (error) {
      const message =
        String(
          error?.message ||
          error
        );

      summary.errors++;

      recordBulkEvent({
        vacancy,

        status:
          "error",

        details:
          message,
      });

      console.error(
        "\nRESULT: ERROR"
      );

      console.error(
        message
      );

      // ==============================================
      // AUTH FAILURE
      // ==============================================

      if (
        isAuthFailure(
          error
        )
      ) {
        console.error(
          "\nAuthentication is unavailable. Stopping the whole bulk run rather than failing every vacancy."
        );

        break;
      }

      // ==============================================
      // UNKNOWN SUBMISSION STATE
      // ==============================================

      if (
        message.includes(
          "SUBMISSION STATUS UNKNOWN"
        )
      ) {
        console.error(
          "\nA Submit click occurred but confirmation was not verified. This vacancy must be inspected manually. The runner will not retry it automatically."
        );
      } else {
        console.log(
          "\nContinuing to the next vacancy..."
        );
      }
    }
  }

  // ==================================================
  // FINAL SUMMARY
  // ==================================================

  console.log(
    "\n\n========================================"
  );

  console.log(
    "BULK RUN COMPLETE"
  );

  console.log(
    "========================================"
  );

  console.log(
    `Considered: ${summary.considered}`
  );

  console.log(
    `Processed: ${summary.processed}`
  );

  console.log(
    `Submitted: ${summary.submitted}`
  );

  console.log(
    `Ready to submit: ${summary.readyToSubmit}`
  );

  console.log(
    `Manual review: ${summary.manualReview}`
  );

  console.log(
    `External applications skipped: ${summary.externalApplication}`
  );

  console.log(
    `Already submitted skipped: ${summary.alreadySubmitted}`
  );

  console.log(
    `Errors: ${summary.errors}`
  );

  console.log(
    `\nBulk log: ${BULK_LOG_FILE}`
  );

  if (
    !options.submit
  ) {
    console.log(
      "\nNo final submissions were authorised by this dry run."
    );
  }
}

// ==================================================
// COMMAND LINE
// ==================================================

if (
  require.main === module
) {
  let options;

  try {
    options =
      parseOptions(
        process.argv.slice(2)
      );
  } catch (error) {
    console.error(
      `\nArgument error: ${error.message}`
    );

    process.exitCode = 1;

    return;
  }

  runBulkApplications(
    options
  ).catch(
    (error) => {
      console.error(
        "\nBulk runner failed before it could continue safely:"
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
  runBulkApplications,
  parseOptions,
  selectSuitableVacancies,
};