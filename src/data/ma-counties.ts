/**
 * Massachusetts county lookup data.
 * Maps county names to Redfin IDs and FIPS codes for data fetching.
 */

export interface CountyInfo {
  name: string;
  redfinId: number;
  fipsCode: string;
  redfinSlug: string;
}

/**
 * Redfin county IDs and FIPS codes for all 14 Massachusetts counties.
 * Redfin IDs sourced from their county housing market pages.
 * FIPS codes follow the standard 5-digit county FIPS format (state 25 = MA).
 */
export const MA_COUNTIES: Record<string, CountyInfo> = {
  hampden: {
    name: "Hampden",
    redfinId: 1225,
    fipsCode: "25013",
    redfinSlug: "Hampden-County",
  },
  hampshire: {
    name: "Hampshire",
    redfinId: 1226,
    fipsCode: "25015",
    redfinSlug: "Hampshire-County",
  },
  franklin: {
    name: "Franklin",
    redfinId: 1220,
    fipsCode: "25011",
    redfinSlug: "Franklin-County",
  },
  berkshire: {
    name: "Berkshire",
    redfinId: 1214,
    fipsCode: "25003",
    redfinSlug: "Berkshire-County",
  },
  middlesex: {
    name: "Middlesex",
    redfinId: 1230,
    fipsCode: "25017",
    redfinSlug: "Middlesex-County",
  },
  suffolk: {
    name: "Suffolk",
    redfinId: 1237,
    fipsCode: "25025",
    redfinSlug: "Suffolk-County",
  },
  norfolk: {
    name: "Norfolk",
    redfinId: 1231,
    fipsCode: "25021",
    redfinSlug: "Norfolk-County",
  },
  essex: {
    name: "Essex",
    redfinId: 1219,
    fipsCode: "25009",
    redfinSlug: "Essex-County",
  },
  worcester: {
    name: "Worcester",
    redfinId: 1240,
    fipsCode: "25027",
    redfinSlug: "Worcester-County",
  },
  plymouth: {
    name: "Plymouth",
    redfinId: 1233,
    fipsCode: "25023",
    redfinSlug: "Plymouth-County",
  },
  barnstable: {
    name: "Barnstable",
    redfinId: 1213,
    fipsCode: "25001",
    redfinSlug: "Barnstable-County",
  },
  bristol: {
    name: "Bristol",
    redfinId: 1216,
    fipsCode: "25005",
    redfinSlug: "Bristol-County",
  },
  dukes: {
    name: "Dukes",
    redfinId: 1218,
    fipsCode: "25007",
    redfinSlug: "Dukes-County",
  },
  nantucket: {
    name: "Nantucket",
    redfinId: 2962,
    fipsCode: "25019",
    redfinSlug: "Nantucket-County",
  },
};

/**
 * Look up a county by name (case-insensitive).
 * Returns undefined if the county is not found.
 */
export function lookupCounty(
  countyName: string
): CountyInfo | undefined {
  const key = countyName.trim().toLowerCase().replace(/\s+county$/, "");
  return MA_COUNTIES[key];
}

/**
 * Get all county names as an array.
 */
export function getAllCountyNames(): string[] {
  return Object.values(MA_COUNTIES).map((c) => c.name);
}
