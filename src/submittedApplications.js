// Print confirmed submissions from the local application history.
// Read-only: this script never opens a browser or submits an application.
const fs = require("fs");
const path = require("path");

const LOG_FILE = path.join(__dirname, "..", "data", "application-log.json");

function main() {
  if (!fs.existsSync(LOG_FILE)) {
    console.log("No local application history found at " + LOG_FILE);
    return;
  }

  let records;
  try {
    records = JSON.parse(fs.readFileSync(LOG_FILE, "utf8"));
  } catch (error) {
    console.error("Unable to read application history: " + error.message);
    process.exitCode = 1;
    return;
  }

  if (!Array.isArray(records)) {
    console.error("Application history must contain an array.");
    process.exitCode = 1;
    return;
  }

  // Only confirmed submissions count. A submission_attempted record is
  // deliberately excluded because the website may not have accepted it.
  const submitted = new Map();
  for (const record of records) {
    if (record?.status !== "submitted") continue;
    const reference = String(record.vacancyReference || "").replace(/^VAC/i, "").trim();
    if (!reference) continue;
    const previous = submitted.get(reference);
    if (!previous || String(record.timestamp || "") > String(previous.timestamp || "")) {
      submitted.set(reference, record);
    }
  }

  const entries = [...submitted.values()].sort(
    (a, b) => String(a.timestamp || "").localeCompare(String(b.timestamp || ""))
  );
  console.log("\nSUBMITTED APPRENTICESHIP APPLICATIONS");
  console.log("========================================");
  if (!entries.length) {
    console.log("No confirmed submissions in the local log.");
  }
  entries.forEach((record, index) => {
    console.log(`${index + 1}. ${record.vacancyTitle || "(Title not recorded)"}`);
    console.log(`   Employer: ${record.employerName || "(Employer not recorded)"}`);
    console.log(`   Reference: ${record.vacancyReference}`);
    if (record.timestamp) console.log(`   Submitted (UTC): ${record.timestamp}`);
    console.log("");
  });
  console.log(`Total confirmed submissions: ${entries.length}`);
  console.log("Source: local data/application-log.json (not a live GOV.UK account lookup).");
}

main();
