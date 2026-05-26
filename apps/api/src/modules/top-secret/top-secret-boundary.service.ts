export const TOP_SECRET_CURSIVE_DOMAIN_ERROR =
  "top secret does not process credit-report or FCRA claims; use Cursive for that workflow";

const CURSIVE_CREDIT_REPORT_DOMAIN_PATTERN =
  /\b(?:fair credit reporting act|fcra|credit bureaus?|credit reports?|consumer reports?|consumer reporting agenc(?:y|ies)|consumer reporting|tradelines?|reinvestigation)\b|\b15\s+u\.?s\.?c\.?(?:\s*(?:§|Â§|sec(?:tion)?\.?|s\.?)\s*)?1681[a-z0-9-]*/iu;

export function isCursiveCreditReportDomainClaim(claim: string) {
  return CURSIVE_CREDIT_REPORT_DOMAIN_PATTERN.test(claim);
}
