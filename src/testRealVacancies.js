require("dotenv").config();

const {
  getAllVacancies,
  matchesCareer,
  isExcluded,
} = require("./finder");

const {
  reviewVacancySuitability,
  printVacancyReview,
} = require("./vacancyReviewer");

const DEFAULT_LIMIT = 20;

function getLimit() {
  const args =
    process.argv.slice(2);

  const index =
    args.indexOf("--limit");

  if (index === -1) {
    return DEFAULT_LIMIT;
  }

  const value =
    Number(args[index + 1]);

  if (
    !Number.isInteger(value) ||
    value < 1
  ) {
    throw new Error(
      "--limit must be a positive whole number."
    );
  }

  return value;
}

function printManualReviewSummary(
  manualReviews
) {
  console.log(
    "\n\n========================================"
  );

  console.log(
    "MANUAL REVIEW VACANCIES"
  );

  console.log(
    "========================================"
  );

  if (
    manualReviews.length === 0
  ) {
    console.log(
      "\nNone."
    );

    return;
  }

  console.log(
    `\nTotal: ${manualReviews.length}`
  );

  for (
    let i = 0;
    i < manualReviews.length;
    i++
  ) {
    const item =
      manualReviews[i];

    console.log(
      "\n----------------------------------------"
    );

    console.log(
      `MANUAL REVIEW ${i + 1} OF ${manualReviews.length}`
    );

    console.log(
      "----------------------------------------"
    );

    console.log(
      `Reference: ${
        item.vacancy.vacancyReference ||
        "(unknown)"
      }`
    );

    console.log(
      `Title: ${
        item.vacancy.title ||
        "(unknown)"
      }`
    );

    console.log(
      `Employer: ${
        item.vacancy.employerName ||
        "(unknown)"
      }`
    );

    if (
      item.review.careerMatch
    ) {
      console.log(
        `Career match: ${item.review.careerMatch}`
      );
    }

    if (
      item.review.reason
    ) {
      console.log(
        `Reason: ${item.review.reason}`
      );
    }

    if (
      item.review.blockingRequirements
        .length > 0
    ) {
      console.log(
        "Blocking requirements:"
      );

      for (
        const requirement
        of item.review
          .blockingRequirements
      ) {
        console.log(
          `- ${requirement}`
        );
      }
    }

    if (
      item.review.unresolvedRequirements
        .length > 0
    ) {
      console.log(
        "Unresolved requirements:"
      );

      for (
        const requirement
        of item.review
          .unresolvedRequirements
      ) {
        console.log(
          `- ${requirement}`
        );
      }
    }
  }
}

async function run() {
  const limit =
    getLimit();

  console.log(
    "========================================"
  );

  console.log(
    "REAL VACANCY SUITABILITY TEST"
  );

  console.log(
    "========================================"
  );

  console.log(
    "\nThis test DOES NOT open GOV.UK applications."
  );

  console.log(
    "This test DOES NOT use Playwright."
  );

  console.log(
    "This test DOES NOT save or submit applications."
  );

  console.log(
    `\nReview limit: ${limit}`
  );

  console.log(
    "\nDownloading vacancies..."
  );

  const allVacancies =
    await getAllVacancies();

  const candidates =
    allVacancies.filter(
      (vacancy) =>
        matchesCareer(vacancy) &&
        !isExcluded(vacancy)
    );

  console.log(
    `\nDownloaded vacancies: ${allVacancies.length}`
  );

  console.log(
    `Keyword-filtered candidates: ${candidates.length}`
  );

  const vacanciesToReview =
    candidates.slice(
      0,
      limit
    );

  const summary = {
    reviewed: 0,
    suitable: 0,
    unsuitable: 0,
    manualReview: 0,
    errors: 0,
  };

  const manualReviews = [];

  for (
    let i = 0;
    i < vacanciesToReview.length;
    i++
  ) {
    const vacancy =
      vacanciesToReview[i];

    console.log(
      "\n\n========================================"
    );

    console.log(
      `REAL VACANCY ${i + 1} OF ${vacanciesToReview.length}`
    );

    console.log(
      "========================================"
    );

    console.log(
      `Reference: ${
        vacancy.vacancyReference ||
        "(unknown)"
      }`
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

    try {
      const review =
        await reviewVacancySuitability(
          vacancy
        );

      summary.reviewed++;

      printVacancyReview(
        review
      );

      if (
        review.status ===
        "suitable"
      ) {
        summary.suitable++;
      } else if (
        review.status ===
        "unsuitable"
      ) {
        summary.unsuitable++;
      } else if (
        review.status ===
        "manual_review"
      ) {
        summary.manualReview++;

        manualReviews.push({
          vacancy,
          review,
        });
      } else {
        summary.errors++;

        console.log(
          `\nUNKNOWN STATUS: ${review.status}`
        );
      }
    } catch (error) {
      summary.errors++;

      console.error(
        "\nREVIEW ERROR:"
      );

      console.error(
        error?.message || error
      );
    }
  }

  console.log(
    "\n\n========================================"
  );

  console.log(
    "REAL VACANCY TEST COMPLETE"
  );

  console.log(
    "========================================"
  );

  console.log(
    `Reviewed: ${summary.reviewed}`
  );

  console.log(
    `Suitable: ${summary.suitable}`
  );

  console.log(
    `Unsuitable: ${summary.unsuitable}`
  );

  console.log(
    `Manual review: ${summary.manualReview}`
  );

  console.log(
    `Errors: ${summary.errors}`
  );

  if (
    summary.reviewed > 0
  ) {
    const suitableRate =
      (
        summary.suitable /
        summary.reviewed *
        100
      ).toFixed(1);

    console.log(
      `Suitable rate: ${suitableRate}%`
    );
  }

  console.log(
    "\nNo applications were opened, saved or submitted."
  );

  printManualReviewSummary(
    manualReviews
  );
}

run().catch(
  (error) => {
    console.error(
      "\nReal vacancy test failed:"
    );

    console.error(error);

    process.exitCode = 1;
  }
);