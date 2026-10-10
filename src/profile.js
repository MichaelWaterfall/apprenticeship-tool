const profile = {

  // --------------------------------------------------
  // BASIC INFORMATION
  // --------------------------------------------------

  location: {
    currentTown: "Paignton",
    county: "Devon",
    country: "United Kingdom",

    willingToRelocate: true,

    canTravelAnywhereNecessary: true,

    drivingLicence: false,

    shiftAvailability: {
      canWorkEarlyShifts: true,
      canWorkLateShifts: true,
      canWorkShiftPatterns: true,

      rule:
        "I am willing and able to work shift patterns, including shifts such as 6:00am-2:00pm and 2:00pm-10:00pm. If necessary, I am willing to relocate close enough to the workplace before the apprenticeship starts so that I can reliably attend early starts and late finishes.",
    },

    // The applicant can travel to locations required by the role,
    // but this must never be turned into a claim that they drive.
    commutingRule:
      "I can travel to any location necessary for the apprenticeship or job and I am willing to relocate for the right apprenticeship. If asked whether I can get to a named workplace, training provider, college or other required location, the answer is yes. I am willing and able to work early and late shift patterns. If necessary, I am willing to relocate close enough to the workplace before starting so that I can reliably attend the required shifts. Do not claim that I drive or have access to a car. Do not invent a specific transport method, route, journey time, accommodation already arranged or other unsupported transport detail.",
  },

  // --------------------------------------------------
  // UK ELIGIBILITY / SECURITY-CLEARANCE FACTS
  // --------------------------------------------------

  eligibility: {
    permanentRightToWorkUK: true,

    continuousUKResidenceLastFiveYears: true,

    britishCitizenFromBirth: true,

    otherNationality: false,

    securityClearanceRule:
      "These facts may be used to assess eligibility for BPSS, SC or UK Eyes Only requirements. Do not claim that I already hold BPSS, SC or any other security clearance unless that is separately verified.",
  },

  // --------------------------------------------------
  // EDUCATION
  // --------------------------------------------------

  education: {
    // The applicant did not take A levels.
    // An explicit essential A-level requirement therefore cannot
    // be treated as unknown or sent to manual review merely because
    // no A-level grades are listed.
    aLevels: [],

    college: {
      institution: "Exeter College",

      qualification:
        "BTEC Level 3 Sport and Exercise Science",

      grade: "D*D*D*",

      dates: "2018-2020",
    },

    school: {
      institution: "St Peter's High School",

      dates: "2013-2018",

      gcses: {
        mathematics: "5",

        englishLanguage: "5",

        englishLiterature: "4",

        biology: "5",

        chemistry: "4",

        physics: "5",
      },
    },
  },

  // --------------------------------------------------
  // EMPLOYMENT
  // --------------------------------------------------

  employment: [
    {
      employer: "Paignton Pier",

      role: "Arcade Worker",

      startDate: "April 2024",

      endDate: "Present",

      responsibilities: [
        "Helping customers",

        "Identifying and dealing with faults on arcade machines",

        "Refilling machines and prizes",

        "Cleaning and maintaining the arcade environment",

        "Working with colleagues as part of a team",

        "Using a methodical approach when investigating machine faults",
      ],

      skills: [
        "Problem solving",

        "Fault finding",

        "Customer service",

        "Teamwork",

        "Communication",

        "Attention to detail",

        "Working under pressure",

        "Reliability",
      ],
    },

    {
      employer: "Costa Coffee",

      location: "Exeter",

      role: "Barista",

      startDate: "June 2021",

      endDate: "March 2023",

      responsibilities: [
        "Preparing drinks and food",

        "Serving customers",

        "Cleaning and maintaining the work area",

        "Cashing up tills",

        "Completing paperwork",

        "Using a point-of-sale system",

        "Helping newer members of staff",
      ],

      achievements: [
        "Passed a drink quality audit",

        "Helped mentor newer members of staff",
      ],

      skills: [
        "Customer service",

        "Communication",

        "Teamwork",

        "Accuracy",

        "Organisation",

        "Working under pressure",

        "Responsibility",
      ],
    },

    {
      employer: "Voltinu",

      role: "Freelance Software Tester",

      startDate: "March 2023",

      endDate: "April 2023",

      responsibilities: [
        "Testing Ethereum smart contracts",

        "Writing and running automated tests",

        "Testing authorised and unauthorised wallet behaviour",

        "Testing revert conditions and edge cases",

        "Checking software behaved as expected",
      ],

      technologies: [
        "Hardhat",

        "TypeScript",

        "Chai",

        "Ethereum",

        "Smart contracts",
      ],

      achievements: [
        "Contributed to achieving 100% test coverage",
      ],

      skills: [
        "Software testing",

        "Analytical thinking",

        "Problem solving",

        "Attention to detail",

        "Logical thinking",

        "Quality assurance",
      ],
    },
  ],

  // --------------------------------------------------
  // PRACTICAL EXAMPLES
  // --------------------------------------------------

  examples: {
    arcadeMachineRepair: {
      title: "Arcade machine fault",

      situation:
        "While working at Paignton Pier, an Easter Egg Party arcade machine developed an Error 18 fault.",

      actions: [
        "Investigated the problem methodically",

        "Opened and dismantled the relevant part of the mechanism",

        "Found a broken capsule containing a prize and tickets lodged in the mechanism and causing a blockage",

        "Removed the blockage",

        "Checked the cog and chute",

        "Reassembled the mechanism",

        "Reset the machine",

        "Tested the machine to make sure it was working correctly",
      ],

      skillsDemonstrated: [
        "Practical problem solving",

        "Fault finding",

        "Logical thinking",

        "Attention to detail",

        "Patience",

        "Following a methodical process",
      ],

      safeUses: [
        "fixing something",

        "repairing something",

        "fault finding",

        "practical problem solving",

        "engineering interest",

        "maintenance",

        "working methodically",
      ],
    },

    softwareTesting: {
      title: "Smart contract testing",

      situation:
        "Completed freelance software testing work involving Ethereum smart contracts.",

      actions: [
        "Used Hardhat, TypeScript and Chai",

        "Created and ran tests",

        "Tested authorised and unauthorised wallet scenarios",

        "Tested revert conditions",

        "Considered edge cases",

        "Worked methodically to improve test coverage",
      ],

      result:
        "Contributed to achieving 100% test coverage.",

      skillsDemonstrated: [
        "Attention to detail",

        "Analytical thinking",

        "Logical thinking",

        "Software testing",

        "Problem solving",

        "Quality assurance",
      ],

      safeUses: [
        "software testing",

        "quality assurance",

        "attention to detail",

        "analytical thinking",

        "problem solving",

        "technology",
      ],
    },
  },

  // --------------------------------------------------
  // PROGRAMMING / TECHNICAL EXPERIENCE
  // --------------------------------------------------

  technicalSkills: {
    programmingLanguages: [
      {
        name: "JavaScript",

        level:
          "Primary programming language used for personal projects",
      },

      {
        name: "Python",

        level:
          "Used for small personal projects",
      },

      {
        name: "C#",

        level:
          "Used for small personal projects",
      },
    ],

    web: [
      "HTML",

      "CSS",
    ],

    softwareTesting: [
      "Hardhat",

      "TypeScript",

      "Chai",

      "Automated testing",

      "Edge-case testing",

      "Revert testing",
    ],

    interests: [
      "Software development",

      "Software testing",

      "Engineering",

      "Automation",

      "Control systems",

      "Electrical systems",

      "Mechanical systems",

      "Maintenance",

      "Fault finding",

      "Manufacturing technology",
    ],
  },

  // --------------------------------------------------
  // PROJECTS
  // --------------------------------------------------

  projects: [
    {
      name: "JavaScript calculator",

      technologies: [
        "JavaScript",
        "HTML",
        "CSS",
      ],

      details: [
        "Built calculator functionality",

        "Added keyboard input",

        "Added decimal handling",

        "Added percentage functionality",

        "Added backspace functionality",
      ],
    },

    {
      name: "Library application",

      technologies: [
        "JavaScript",
      ],

      details: [
        "Created a small library application",

        "Used unique IDs for entries",

        "Implemented functionality for removing entries",
      ],
    },

    {
      name: "Tic-Tac-Toe",

      technologies: [
        "JavaScript",
      ],

      details: [
        "Built a playable Tic-Tac-Toe project",
      ],
    },

    {
      name: "Snake",

      technologies: [
        "Python",
      ],

      details: [
        "Built a small Snake game project",
      ],
    },

    {
      name: "Arduino traffic light",

      technologies: [
        "Arduino",
      ],

      details: [
        "Completed a beginner traffic-light project using Arduino",
      ],

      safeUses: [
        "beginner electronics interest",

        "engineering interest",

        "practical technology projects",
      ],
    },
  ],

  // --------------------------------------------------
  // GENERAL STRENGTHS
  // --------------------------------------------------

  strengths: [
    "Problem solving",

    "Attention to detail",

    "Logical thinking",

    "Fault finding",

    "Analytical thinking",

    "Teamwork",

    "Communication",

    "Customer service",

    "Reliability",

    "Working under pressure",

    "Independent learning",

    "Initiative",

    "Willingness to learn",
  ],

  // --------------------------------------------------
  // CAREER INTERESTS
  // --------------------------------------------------

  careerInterests: [
    "Engineering",

    "Engineering maintenance",

    "Mechatronics",

    "Automation",

    "Control systems",

    "Electrical engineering",

    "Electronics",

    "Mechanical engineering",

    "Manufacturing",

    "Machining",

    "CNC",

    "Welding",

    "Fabrication",

    "Instrumentation",

    "Building services",

    "Software development",

    "Software testing",

    "Quality assurance",
  ],

  // --------------------------------------------------
  // ANSWER-WRITING RULES
  // --------------------------------------------------

  answerRules: {
    maximumWords: 300,

    style: [
      "Write naturally in first person",

      "Use British English",

      "Sound like a genuine apprenticeship applicant",

      "Be specific rather than generic",

      "Tailor the answer to the apprenticeship",

      "Use concrete examples when relevant",

      "Keep answers concise",

      "Avoid exaggerated language",

      "Do not make every answer sound identical",
    ],

    prohibitedClaims: [
      "Do not invent qualifications",

      "Do not invent employment",

      "Do not invent projects",

      "Do not invent technical experience",

      "Do not claim professional engineering experience",

      "Do not claim professional electrical experience",

      "Do not claim professional mechanical experience",

      "Do not claim professional welding experience",

      "Do not claim professional PLC experience",

      "Do not claim professional automation experience",

      "Do not claim to have a driving licence",

      "Do not claim to own or have access to a car",

      "Do not invent a commuting route",

      "Do not invent knowledge about an employer",

      "Do not claim to have researched an employer unless vacancy information actually supports the statement",

      "Do not invent achievements or numerical results",

      "Do not claim to already hold BPSS, SC or another security clearance unless explicitly verified",
    ],

    uncertaintyRule:
      "If the application asks for information that is not supported by this profile or the vacancy data, do not guess. Flag the question for manual review.",
  },
};

module.exports = profile;