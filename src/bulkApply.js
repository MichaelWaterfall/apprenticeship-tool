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

const {
  reviewVacancySuitability,
  printVacancyReview,
} = require("./vacancyReviewer");

const BULK_LOG_FILE = path.join(
  __dirname,
  "..",
  "data",
  "bulk-run-log.json"
);

const DEFAULT_LIMIT = 1;

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
  const records = readBulkLog();

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

function getArgValue(args, name) {
  const index = args.indexOf(name);

  if (index === -1) {
    return null;
  }

  const value = args[index + 1];

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
  const parsed = Number(value);

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

  if (all && limitValue) {
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
    `Vacancy review limit: ${
      options.limit === Infinity
        ? "ALL"
        : options.limit
    }`
  );

  console.log(
    `Start position: ${options.start}`
  );

  if (options.reference) {
    console.log(
      `Reference filter: ${options.reference}`
    );
  }

  if (!options.submit) {
    console.log(
      "\nDRY RUN: suitable applications may be filled and saved, but final Submit will not be clicked."
    );
  } else {
    console.log(
      "\nLIVE MODE: vacancies must pass the suitability gate and all application gates before a native GOV.UK application can be submitted."
    );
  }
}

function selectSuitableVacancies(
  allVacancies,
  options
) {
  let candidates =
    allVacancies.filter(
      (vacancy) =>
        matchesCareer(vacancy) &&
        !isExcluded(vacancy)
    );

  if (options.reference) {
    candidates =
      candidates.filter(
        (vacancy) =>
          normaliseVacancyReference(
            vacancy.vacancyReference
          ) ===
          options.reference
      );
  }

  return candidates;
}

function isAuthFailure(error) {
  const message = String(
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

function summariseResult(result) {
  if (!result || !result.status) {
    return "unknown";
  }

  return result.status;
}

function formatSuitabilityDetails(
  review
) {
  return JSON.stringify({
    status:
      review.status,

    careerMatch:
      review.careerMatch,

    reason:
      review.reason,

    blockingRequirements:
      review.blockingRequirements,

    unresolvedRequirements:
      review.unresolvedRequirements,
  });
}

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
  // CHEAP KEYWORD FILTER
  // ------------------------------------------------

  const candidateVacancies =
    selectSuitableVacancies(
      allVacancies,
      options
    );

  console.log(
    `\nKeyword-filtered candidate vacancies: ${candidateVacancies.length}`
  );

  if (
    candidateVacancies.length === 0
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
    candidateVacancies.slice(
      startIndex
    );

  // ------------------------------------------------
  // SUMMARY
  // ------------------------------------------------

  const summary = {
    considered: 0,
    suitabilityReviewed: 0,
    suitable: 0,
    unsuitable: 0,
    suitabilityManualReview: 0,
    processed: 0,
    submitted: 0,
    readyToSubmit: 0,
    applicationManualReview: 0,
    externalApplication: 0,
    alreadySubmitted: 0,
    errors: 0,
  };

  let reviewedCount = 0;

  // ------------------------------------------------
  // PROCESS VACANCIES
  // ------------------------------------------------

  for (
    let i = 0;
    i < candidates.length;
    i++
  ) {
    if (
      reviewedCount >=
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
      startIndex + i + 1;

    summary.considered++;

    console.log(
      "\n\n========================================"
    );

    console.log(
      `VACANCY ${position} OF ${candidateVacancies.length}`
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

    if (existingSubmission) {
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
    // SUITABILITY REVIEW COUNTS TOWARD LIMIT
    // ================================================

    reviewedCount++;
    summary.suitabilityReviewed++;

    // ================================================
    // SUITABILITY GATE
    // ================================================

    let suitabilityReview;

    try {
      suitabilityReview =
        await reviewVacancySuitability(
          vacancy
        );

      printVacancyReview(
        suitabilityReview
      );

      recordBulkEvent({
        vacancy,
        status:
          `suitability_${suitabilityReview.status}`,
        details:
          formatSuitabilityDetails(
            suitabilityReview
          ),
      });
    } catch (error) {
      const message = String(
        error?.message || error
      );

      summary.errors++;

      recordBulkEvent({
        vacancy,
        status:
          "suitability_error",
        details:
          message,
      });

      console.error(
        "\nRESULT: SUITABILITY REVIEW ERROR"
      );

      console.error(
        message
      );

      console.log(
        "Skipping this vacancy without opening an application."
      );

      continue;
    }

    if (
      suitabilityReview.status ===
      "unsuitable"
    ) {
      summary.unsuitable++;

      console.log(
        "\nRESULT: UNSUITABLE - skipped before opening application"
      );

      continue;
    }

    if (
      suitabilityReview.status ===
      "manual_review"
    ) {
      summary.suitabilityManualReview++;

      console.log(
        "\nRESULT: SUITABILITY MANUAL REVIEW - skipped before opening application"
      );

      continue;
    }

    if (
      suitabilityReview.status !==
      "suitable"
    ) {
      summary.errors++;

      console.log(
        `\nRESULT: UNKNOWN SUITABILITY STATUS "${suitabilityReview.status}" - skipped`
      );

      continue;
    }

    summary.suitable++;
    summary.processed++;

    recordBulkEvent({
      vacancy,
      status:
        "application_started",
      details:
        options.submit
          ? "Suitability gate passed. Live application started."
          : "Suitability gate passed. Dry-run application started.",
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
          summary.applicationManualReview++;

          console.log(
            "\nRESULT: APPLICATION MANUAL REVIEW - continuing to next vacancy"
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
      const message = String(
        error?.message || error
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

      if (isAuthFailure(error)) {
        console.error(
          "\nAuthentication is unavailable. Stopping the whole bulk run rather than failing every vacancy."
        );
        break;
      }

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
    `Suitability reviewed: ${summary.suitabilityReviewed}`
  );

  console.log(
    `Suitable: ${summary.suitable}`
  );

  console.log(
    `Unsuitable: ${summary.unsuitable}`
  );

  console.log(
    `Suitability manual review: ${summary.suitabilityManualReview}`
  );

  console.log(
    `Applications processed: ${summary.processed}`
  );

  console.log(
    `Submitted: ${summary.submitted}`
  );

  console.log(
    `Ready to submit: ${summary.readyToSubmit}`
  );

  console.log(
    `Application manual review: ${summary.applicationManualReview}`
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

  if (!options.submit) {
    console.log(
      "\nNo final submissions were authorised by this dry run."
    );
  }
}

if (require.main === module) {
  let options;

  try {
    options = parseOptions(
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

      console.error(error);

      process.exitCode = 1;
    }
  );
}

module.exports = {
  runBulkApplications,
  parseOptions,
  selectSuitableVacancies,
};