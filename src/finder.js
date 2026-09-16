require("dotenv").config();

const API_URL =
  "https://api.apprenticeships.education.gov.uk/vacancies/vacancy";

async function findApprenticeships() {
  try {
    console.log("Searching all apprenticeships...\n");

    const pageSize = 100;
    let pageNumber = 1;

    let allVacancies = [];
    let totalVacancies = 0;

    do {
      console.log(`Downloading page ${pageNumber}...`);

      const response = await fetch(
        `${API_URL}?PageNumber=${pageNumber}&PageSize=${pageSize}&Sort=AgeDesc&IncludeDetails=true`,
        {
          headers: {
            "Ocp-Apim-Subscription-Key":
              process.env.APPRENTICESHIP_API_KEY,

            "X-Version": "2",
          },
        }
      );

      if (!response.ok) {
        throw new Error(
          `API request failed: ${response.status} ${response.statusText}`
        );
      }

      const data = await response.json();

      totalVacancies = data.total;

      allVacancies.push(...data.vacancies);

      pageNumber++;

    } while (allVacancies.length < totalVacancies);

    console.log("\nDownload complete.");
    console.log(`Total vacancies: ${allVacancies.length}\n`);

    // Filter vacancies
    const suitableVacancies = allVacancies.filter((vacancy) => {

      if (!matchesCareer(vacancy)) {
        return false;
      }

      if (isExcluded(vacancy)) {
        return false;
      }

      return true;
    });

    console.log(
      `Found ${suitableVacancies.length} potentially suitable apprenticeships.\n`
    );

    // Display results
    for (const vacancy of suitableVacancies) {

      console.log("========================================");

      console.log(`TITLE: ${vacancy.title}`);

      console.log(`EMPLOYER: ${vacancy.employerName}`);

      console.log(
        `COURSE: ${vacancy.course?.title || "Not provided"}`
      );

      console.log(
        `LEVEL: ${vacancy.course?.level || "Not provided"}`
      );

      console.log(
        `REFERENCE: ${vacancy.vacancyReference}`
      );

      console.log(
        `VACANCY URL: ${vacancy.vacancyUrl || "Not provided"}`
      );

      console.log(
        `APPLICATION URL: ${
          vacancy.applicationUrl ||
          "GOV.UK / not separately provided"
        }`
      );

      console.log("========================================\n");
    }

  } catch (error) {

    console.error("Something went wrong:");
    console.error(error.message);

  }
}
findApprenticeships();