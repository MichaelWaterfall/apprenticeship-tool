require("dotenv").config();

const {
  reviewVacancySuitability,
  printVacancyReview,
} = require("./vacancyReviewer");

const TEST_CASES = [
  {
    name: "VALID MAINTENANCE ENGINEERING APPRENTICESHIP",

    expectedStatus: "suitable",

    vacancy: {
      vacancyReference: "TEST001",

      title:
        "Maintenance Engineering Apprentice",

      employerName:
        "TEST ENGINEERING LTD",

      description:
        "An apprenticeship working with the engineering maintenance team.",

      fullDescription:
        `
        You will learn to carry out planned maintenance,
        assist with fault finding, support repairs to
        machinery and develop practical mechanical and
        electrical engineering skills.
        `,

      trainingDescription:
        `
        You will complete an engineering apprenticeship
        with structured workplace training.
        `,

      thingsToConsider:
        "",

      qualifications: [
        {
          qualificationType: "GCSE",
          subject: "English",
          grade: "4",
          weight: "Essential",
        },
        {
          qualificationType: "GCSE",
          subject: "Maths",
          grade: "4",
          weight: "Essential",
        },
      ],

      skills: [
        "Problem solving skills",
        "Attention to detail",
        "Team working",
      ],

      course: {
        title:
          "Engineering Operative",
        level: 2,
        route:
          "Engineering and manufacturing",
        type:
          "Standard",
      },
    },
  },

  {
    name: "DRIVING LICENCE ESSENTIAL",

    expectedStatus: "unsuitable",

    vacancy: {
      vacancyReference: "TEST002",

      title:
        "Field Service Engineering Apprentice",

      employerName:
        "TEST FIELD ENGINEERING LTD",

      description:
        "Train as a field service engineer maintaining equipment at customer sites.",

      fullDescription:
        `
        You will learn fault finding, servicing,
        maintenance and repair of engineering equipment
        at customer locations.

        A full UK driving licence is essential for this
        role because travel between customer sites is
        required.
        `,

      trainingDescription:
        "Engineering training will be provided.",

      thingsToConsider:
        "A full UK driving licence is essential.",

      qualifications: [],

      skills: [
        "Problem solving skills",
      ],

      course: {
        title:
          "Engineering Operative",
        level: 2,
        route:
          "Engineering and manufacturing",
        type:
          "Standard",
      },
    },
  },

  {
    name: "DEGREE ESSENTIAL",

    expectedStatus: "unsuitable",

    vacancy: {
      vacancyReference: "TEST003",

      title:
        "Software Engineering Apprentice",

      employerName:
        "TEST SOFTWARE LTD",

      description:
        "Software engineering apprenticeship.",

      fullDescription:
        `
        You will work with the software engineering team
        developing and testing applications.

        Applicants must already hold a bachelor's degree
        in Computer Science. This is an essential entry
        requirement.
        `,

      trainingDescription:
        "Further software engineering training will be provided.",

      thingsToConsider:
        "",

      qualifications: [
        {
          qualificationType:
            "Bachelor's degree",
          subject:
            "Computer Science",
          grade:
            "Pass",
          weight:
            "Essential",
        },
      ],

      skills: [
        "IT skills",
        "Problem solving skills",
      ],

      course: {
        title:
          "Software Developer",
        level: 4,
        route:
          "Digital",
        type:
          "Standard",
      },
    },
  },

  {
    name: "FALSE KEYWORD MATCH",

    expectedStatus: "unsuitable",

    vacancy: {
      vacancyReference: "TEST004",

      title:
        "Business Administration Apprentice",

      employerName:
        "TEST OFFICE SERVICES LTD",

      description:
        `
        Business administration apprenticeship supporting
        an office that provides services to engineering
        companies.
        `,

      fullDescription:
        `
        Your duties will include answering telephone
        calls, arranging meetings, updating spreadsheets,
        filing documents, responding to emails and
        providing general administrative support.

        Some of our customers operate in the engineering
        and manufacturing industries.
        `,

      trainingDescription:
        `
        You will complete a Business Administrator
        apprenticeship.
        `,

      thingsToConsider:
        "",

      qualifications: [],

      skills: [
        "Administrative skills",
        "Communication skills",
      ],

      course: {
        title:
          "Business Administrator",
        level: 3,
        route:
          "Business and administration",
        type:
          "Standard",
      },
    },
  },

  {
    name: "UNCLEAR ESSENTIAL REQUIREMENT",

    expectedStatus: "manual_review",

    vacancy: {
      vacancyReference: "TEST005",

      title:
        "Automation Engineering Apprentice",

      employerName:
        "TEST AUTOMATION LTD",

      description:
        "Automation and controls engineering apprenticeship.",

      fullDescription:
        `
        You will learn about automation equipment,
        control systems, sensors and industrial machinery.

        Applicants must hold the required industry
        certification before starting employment.
        Evidence of the certification will be required.
        `,

      trainingDescription:
        `
        Training will cover automation and control
        systems.
        `,

      thingsToConsider:
        `
        Required industry certification must be held
        before employment begins. The vacancy does not
        specify which certification is required.
        `,

      qualifications: [],

      skills: [
        "Problem solving skills",
        "Logical",
      ],

      course: {
        title:
          "Engineering Technician",
        level: 3,
        route:
          "Engineering and manufacturing",
        type:
          "Standard",
      },
    },
  },

  {
    name: "CYBER SECURITY IS NOT A TARGET CAREER",

    expectedStatus: "unsuitable",

    vacancy: {
      vacancyReference: "TEST006",

      title:
        "Cyber Security Engineer Apprentice",

      employerName:
        "TEST CYBER SECURITY LTD",

      description:
        `
        Work with a cyber security team protecting
        systems, networks and cloud infrastructure.
        `,

      fullDescription:
        `
        You will monitor security alerts, investigate
        potential cyber threats, support vulnerability
        management, help secure cloud infrastructure,
        review security events and assist with incident
        response.

        You may use technologies including Python,
        Linux, Azure, AWS and PowerShell as part of
        your cyber security work.
        `,

      trainingDescription:
        `
        You will complete a Level 4 Cyber Security
        Technologist apprenticeship.
        `,

      thingsToConsider:
        "",

      qualifications: [],

      skills: [
        "IT skills",
        "Problem solving skills",
        "Analytical skills",
      ],

      course: {
        title:
          "Cyber Security Technologist",
        level: 4,
        route:
          "Digital",
        type:
          "Standard",
      },
    },
  },

  {
    name: "GENERIC IT SUPPORT IS NOT SOFTWARE DEVELOPMENT",

    expectedStatus: "unsuitable",

    vacancy: {
      vacancyReference: "TEST007",

      title:
        "IT Support Apprentice",

      employerName:
        "TEST IT SERVICES LTD",

      description:
        `
        Provide first-line IT support to users across
        the organisation.
        `,

      fullDescription:
        `
        You will respond to IT support requests,
        troubleshoot laptops and desktop computers,
        reset passwords, create user accounts,
        install standard software, configure devices,
        support Microsoft 365 and escalate technical
        incidents when necessary.

        You may test software installations and
        troubleshoot applications as part of providing
        user support.

        The main occupation is IT support.
        `,

      trainingDescription:
        `
        You will complete the Level 3 Information
        Communications Technician apprenticeship.
        `,

      thingsToConsider:
        "",

      qualifications: [],

      skills: [
        "IT skills",
        "Customer care skills",
        "Problem solving skills",
      ],

      course: {
        title:
          "Information Communications Technician",
        level: 3,
        route:
          "Digital",
        type:
          "Standard",
      },
    },
  },

  {
    name: "MOTOR VEHICLE APPRENTICESHIP EXCLUDED",

    expectedStatus: "unsuitable",

    vacancy: {
      vacancyReference: "TEST008",

      title:
        "Motor Vehicle Technician Apprentice",

      employerName:
        "TEST MOTORS LTD",

      description:
        `
        Train as a motor vehicle technician servicing
        and repairing cars.
        `,

      fullDescription:
        `
        You will inspect, service, diagnose and repair
        cars and light vehicles.

        Duties include routine servicing, brake work,
        vehicle diagnostics, replacing mechanical
        components and identifying electrical and
        mechanical vehicle faults.
        `,

      trainingDescription:
        `
        You will complete a Light Vehicle Service and
        Maintenance Technician apprenticeship.
        `,

      thingsToConsider:
        "",

      qualifications: [],

      skills: [
        "Problem solving skills",
        "Mechanical skills",
      ],

      course: {
        title:
          "Motor Vehicle Service and Maintenance Technician",
        level: 3,
        route:
          "Engineering and manufacturing",
        type:
          "Standard",
      },
    },
  },

  {
    name: "GENUINE LEAN MANUFACTURING APPRENTICESHIP",

    expectedStatus: "suitable",

    vacancy: {
      vacancyReference: "TEST009",

      title:
        "Lean Manufacturing Apprentice",

      employerName:
        "TEST MANUFACTURING LTD",

      description:
        `
        Train in lean manufacturing and continuous
        improvement within a manufacturing environment.
        `,

      fullDescription:
        `
        You will work within the manufacturing team
        learning lean manufacturing principles and
        supporting improvements to production processes.

        Your duties will include identifying waste,
        supporting continuous improvement activities,
        following standardised working procedures,
        monitoring quality, using 5S techniques and
        helping improve manufacturing efficiency.

        You will learn how manufacturing processes
        operate and how lean techniques can be used
        to improve quality, productivity and workflow.
        `,

      trainingDescription:
        `
        You will complete the Lean Manufacturing
        Operative apprenticeship and receive workplace
        training in lean manufacturing methods,
        continuous improvement, quality and
        manufacturing processes.
        `,

      thingsToConsider:
        "",

      qualifications: [
        {
          qualificationType: "GCSE",
          subject: "English",
          grade: "4",
          weight: "Essential",
        },
        {
          qualificationType: "GCSE",
          subject: "Maths",
          grade: "4",
          weight: "Essential",
        },
      ],

      skills: [
        "Problem solving skills",
        "Attention to detail",
        "Team working",
      ],

      course: {
        title:
          "Lean Manufacturing Operative",
        level: 2,
        route:
          "Engineering and manufacturing",
        type:
          "Standard",
      },
    },
  },
];

async function runTests() {
  console.log(
    "========================================"
  );

  console.log(
    "VACANCY REVIEWER TESTS"
  );

  console.log(
    "========================================"
  );

  console.log(
    `\nTest cases: ${TEST_CASES.length}`
  );

  console.log(
    "No browser will be opened."
  );

  console.log(
    "No applications will be changed or submitted."
  );

  let passed = 0;
  let failed = 0;
  let errors = 0;

  for (
    let i = 0;
    i < TEST_CASES.length;
    i++
  ) {
    const test =
      TEST_CASES[i];

    console.log(
      "\n\n========================================"
    );

    console.log(
      `TEST ${i + 1}: ${test.name}`
    );

    console.log(
      "========================================"
    );

    console.log(
      `Expected: ${test.expectedStatus.toUpperCase()}`
    );

    try {
      const review =
        await reviewVacancySuitability(
          test.vacancy
        );

      printVacancyReview(
        review
      );

      console.log(
        `\nExpected status: ${test.expectedStatus.toUpperCase()}`
      );

      console.log(
        `Actual status:   ${review.status.toUpperCase()}`
      );

      if (
        review.status ===
        test.expectedStatus
      ) {
        passed++;

        console.log(
          "\nTEST RESULT: PASS"
        );
      } else {
        failed++;

        console.log(
          "\nTEST RESULT: FAIL"
        );
      }
    } catch (error) {
      errors++;

      console.error(
        "\nTEST RESULT: ERROR"
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
    "TEST SUITE COMPLETE"
  );

  console.log(
    "========================================"
  );

  console.log(
    `Passed: ${passed}`
  );

  console.log(
    `Failed: ${failed}`
  );

  console.log(
    `Errors: ${errors}`
  );

  console.log(
    `Total: ${TEST_CASES.length}`
  );

  if (
    passed === TEST_CASES.length &&
    failed === 0 &&
    errors === 0
  ) {
    console.log(
      "\nALL VACANCY REVIEWER TESTS PASSED."
    );
  } else {
    console.log(
      "\nVACANCY REVIEWER NEEDS INVESTIGATION BEFORE LIVE BULK SUBMISSION."
    );

    process.exitCode = 1;
  }
}

runTests().catch(
  (error) => {
    console.error(
      "\nTest suite failed:"
    );

    console.error(error);

    process.exitCode = 1;
  }
);