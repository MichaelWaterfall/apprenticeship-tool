require("dotenv").config();

const API_URL =
  "https://api.apprenticeships.education.gov.uk/vacancies/vacancy";

// ==================================================
// CAREER KEYWORDS
// ==================================================

const careerKeywords = [
  // Engineering
  "engineer",
  "engineering",
  "engineering technician",

  // Maintenance / mechatronics
  "maintenance",
  "mechatronic",
  "mechatronics",
  "electromechanical",

  // Automation / controls
  "automation",
  "control",
  "controls",
  "PLC",
  "instrumentation",

  // Electrical / electronics
  "electrical",
  "electrician",
  "electronic",
  "electronics",

  // Software
  "software",

  // Manufacturing
  "manufacturing",
  "machinist",
  "machining",
  "CNC",
  "fabrication",
  "fabricator",
  "welder",
  "welding",

  // Building services / technical construction
  "building services",
  "BMS",
  "HVAC",
  "refrigeration",
  "air conditioning",
  "lift engineer",
  "plant engineer",
  "plant maintenance",
  "fire and security",
  "civil engineering",

  // Oil / gas / offshore
  "oil and gas",
  "oil & gas",
  "offshore",
  "offshore technician",
  "subsea",
  "drilling",
  "process technician",
  "instrumentation technician",
  "mechanical technician",
  "electrical technician",
  "nuclear",

  // Mining / quarry / heavy plant
  "mining",
  "mine",
  "mineral",
  "mineral processing",
  "quarry",
  "quarrying",
  "heavy plant",
  "plant mechanic",
  "plant technician",
  "mobile plant",
  "chemical",
  "water",

  // Software development
  "software",
  "software developer",
  "software engineer",
  "developer",
  "programmer",
  "web developer",
  "application developer",

  // Software testing / QA
  "software tester",
  "tester",
  "testing",
  "QA",
  "quality assurance",
  "test engineer",
  "test analyst",
];

// ==================================================
// EXCLUDED KEYWORDS
// ==================================================

const excludedKeywords = [
  "Royal Air Force",
  "RAF",
  "Royal Navy",
  "British Army",
  "Army",
  "Armed Forces",
  "Royal Marines",
  "Ministry of Defence",
  "MOD",
];

// ==================================================
// CAREER MATCHING
// ==================================================

function matchesCareer(vacancy) {
  const searchableText = `
    ${vacancy.title || ""}
    ${vacancy.employerName || ""}
    ${vacancy.course?.title || ""}
    ${vacancy.description || ""}
    ${vacancy.fullDescription || ""}
  `.toLowerCase();

  return careerKeywords.some((keyword) =>
    searchableText.includes(
      keyword.toLowerCase()
    )
  );
}

// ==================================================
// EXCLUSIONS
// ==================================================

function isExcluded(vacancy) {
  const searchableText = `
    ${vacancy.title || ""}
    ${vacancy.employerName || ""}
    ${vacancy.description || ""}
    ${vacancy.fullDescription || ""}
  `.toLowerCase();

  return excludedKeywords.some((keyword) =>
    searchableText.includes(
      keyword.toLowerCase()
    )
  );
}

// ==================================================
// DOWNLOAD ALL VACANCIES
// ==================================================

async function getAllVacancies() {
  if (
    !process.env.APPRENTICESHIP_API_KEY
  ) {
    throw new Error(
      "APPRENTICESHIP_API_KEY is missing from .env"
    );
  }

  console.log(
    "Searching all apprenticeships...\n"
  );

  const pageSize = 100;

  let pageNumber = 1;
  let totalPages = null;

  const allVacancies = [];

  do {
    console.log(
      `Downloading page ${pageNumber}${
        totalPages
          ? ` of ${totalPages}`
          : ""
      }...`
    );

    const response = await fetch(
      `${API_URL}?PageNumber=${pageNumber}&PageSize=${pageSize}&Sort=AgeDesc&IncludeDetails=true`,
      {
        headers: {
          "Ocp-Apim-Subscription-Key":
            process.env
              .APPRENTICESHIP_API_KEY,

          "X-Version": "2",
        },
      }
    );

    if (!response.ok) {
      throw new Error(
        `API request failed on page ${pageNumber}: ${response.status} ${response.statusText}`
      );
    }

    const data =
      await response.json();

    if (
      !Array.isArray(data.vacancies)
    ) {
      throw new Error(
        `Page ${pageNumber} did not contain a vacancies array.`
      );
    }

    if (
      totalPages === null
    ) {
      totalPages =
        Number(data.totalPages);

      if (
        !Number.isInteger(totalPages) ||
        totalPages < 1
      ) {
        throw new Error(
          `Invalid totalPages returned by API: ${data.totalPages}`
        );
      }

      console.log(
        `API reports ${data.total} vacancies across ${totalPages} pages.\n`
      );
    }

    allVacancies.push(
      ...data.vacancies
    );

    pageNumber++;

  } while (
    pageNumber <= totalPages
  );

  console.log(
    "\nDownload complete."
  );

  console.log(
    `Downloaded vacancies: ${allVacancies.length}\n`
  );

  return allVacancies;
}

// ==================================================
// GET SUITABLE VACANCIES
// ==================================================

async function getSuitableVacancies() {
  const allVacancies =
    await getAllVacancies();

  return allVacancies.filter(
    (vacancy) => {
      if (
        !matchesCareer(vacancy)
      ) {
        return false;
      }

      if (
        isExcluded(vacancy)
      ) {
        return false;
      }

      return true;
    }
  );
}

// ==================================================
// FIND ONE VACANCY
// ==================================================

async function findVacancy({
  vacancyReference,
  vacancyUrl,
} = {}) {
  const allVacancies =
    await getAllVacancies();

  // Find by reference first.
  if (vacancyReference) {
    const wantedReference =
      String(vacancyReference)
        .trim()
        .toLowerCase();

    const match =
      allVacancies.find(
        (vacancy) =>
          String(
            vacancy.vacancyReference ||
            ""
          )
            .trim()
            .toLowerCase() ===
          wantedReference
      );

    if (match) {
      return match;
    }
  }

  // Otherwise try the vacancy URL.
  if (vacancyUrl) {
    const wantedUrl =
      normaliseUrl(vacancyUrl);

    const match =
      allVacancies.find(
        (vacancy) =>
          normaliseUrl(
            vacancy.vacancyUrl
          ) === wantedUrl
      );

    if (match) {
      return match;
    }
  }

  return null;
}

// ==================================================
// NORMALISE URL
// ==================================================

function normaliseUrl(url) {
  if (!url) {
    return "";
  }

  return String(url)
    .trim()
    .toLowerCase()
    .replace(/\/+$/, "");
}

// ==================================================
// DISPLAY VACANCY
// ==================================================

function displayVacancy(vacancy) {
  console.log(
    "========================================"
  );

  console.log(
    `TITLE: ${vacancy.title}`
  );

  console.log(
    `EMPLOYER: ${vacancy.employerName}`
  );

  console.log(
    `COURSE: ${
      vacancy.course?.title ||
      "Not provided"
    }`
  );

  console.log(
    `LEVEL: ${
      vacancy.course?.level ||
      vacancy.apprenticeshipLevel ||
      "Not provided"
    }`
  );

  console.log(
    `REFERENCE: ${
      vacancy.vacancyReference
    }`
  );

  console.log(
    `VACANCY URL: ${
      vacancy.vacancyUrl ||
      "Not provided"
    }`
  );

  console.log(
    "========================================\n"
  );
}

// ==================================================
// STANDALONE FINDER
// ==================================================

async function findApprenticeships() {
  try {
    const suitableVacancies =
      await getSuitableVacancies();

    console.log(
      `Found ${suitableVacancies.length} potentially suitable apprenticeships.\n`
    );

    for (
      const vacancy
      of suitableVacancies
    ) {
      displayVacancy(
        vacancy
      );
    }

    return suitableVacancies;

  } catch (error) {
    console.error(
      "Something went wrong:"
    );

    console.error(
      error.message
    );

    return [];
  }
}

// ==================================================
// EXPORTS
// ==================================================

module.exports = {
  getAllVacancies,
  getSuitableVacancies,
  findVacancy,
  matchesCareer,
  isExcluded,
  displayVacancy,
};

// ==================================================
// RUN ONLY WHEN EXECUTED DIRECTLY
// ==================================================

if (require.main === module) {
  findApprenticeships();
}