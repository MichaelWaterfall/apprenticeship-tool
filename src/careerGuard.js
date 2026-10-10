
const excludedOccupations = [
  /\bground\s?work(?:er|ing)?\b/i,
  /\bwarehouse (?:operative|assistant|apprentice)\b/i,
  /\bstores\/warehouse\b/i,
  /\bgarage door installer\b/i,
  /\bblind(?:s)? (?:manufacturing|production|maker)\b/i,
];

function checkCareer(vacancy) {
  const title = String(vacancy.title || "");

  if (excludedOccupations.some(pattern => pattern.test(title))) {
    return {
      allowed: false,
      reason: `Excluded occupation: ${title}`,
    };
  }

  return {
    allowed: true,
    reason: "No explicit exclusion; further review required",
  };
}

module.exports = { checkCareer };
