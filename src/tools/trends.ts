/**
 * price_trends tool: fetches historical housing data from the FRED API.
 * Requires a FRED_API_KEY environment variable (free at https://fred.stlouisfed.org/docs/api/api_key.html).
 */

import { z } from "zod";
import { lookupCounty } from "../data/ma-counties.js";
import { cachedFetchJson } from "../utils/fetch.js";

export const priceTrendsSchema = {
  county: z.string().describe("County name (e.g. 'Hampden', 'Suffolk')"),
  state: z
    .string()
    .default("MA")
    .describe("State abbreviation (default: MA)"),
  metric: z
    .enum(["median_price", "days_on_market", "inventory"])
    .describe("Which metric to retrieve historical data for"),
};

interface FredObservation {
  date: string;
  value: string;
}

interface FredApiResponse {
  observations?: FredObservation[];
  error_message?: string;
}

export interface TrendDataPoint {
  date: string;
  value: number | null;
}

export interface TrendsResult {
  county: string;
  state: string;
  metric: string;
  series_id: string;
  data_points: TrendDataPoint[];
  source: string;
}

/**
 * Map county FIPS codes to FRED series IDs.
 * FRED uses county-level FIPS for many housing series.
 *
 * Series ID patterns:
 *  - Median listing price: MEDLISPRI{FIPS}
 *  - Active listings count: ACTLISCOU{FIPS}
 *  - Median days on market: MEDDAYONMAR{FIPS}
 */
function getFredSeriesId(
  fipsCode: string,
  metric: string
): string {
  switch (metric) {
    case "median_price":
      return `MEDLISPRI${fipsCode}`;
    case "days_on_market":
      return `MEDDAYONMAR${fipsCode}`;
    case "inventory":
      return `ACTLISCOU${fipsCode}`;
    default:
      throw new Error(`Unknown metric: ${metric}`);
  }
}

/**
 * Fetch historical trend data from the FRED API.
 */
export async function getPriceTrends(
  county: string,
  state: string,
  metric: string
): Promise<TrendsResult> {
  const apiKey = process.env.FRED_API_KEY;
  if (!apiKey) {
    throw new Error(
      "FRED_API_KEY environment variable is not set. " +
        "Get a free key at https://fred.stlouisfed.org/docs/api/api_key.html"
    );
  }

  const countyInfo = lookupCounty(county);
  if (!countyInfo) {
    throw new Error(
      `County "${county}" not found. Supported MA counties: ` +
        `Hampden, Hampshire, Franklin, Berkshire, Middlesex, Suffolk, ` +
        `Norfolk, Essex, Worcester, Plymouth, Barnstable, Bristol, Dukes, Nantucket.`
    );
  }

  const seriesId = getFredSeriesId(countyInfo.fipsCode, metric);

  // Fetch last 12 months of data
  const now = new Date();
  const oneYearAgo = new Date(now);
  oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

  const startDate = oneYearAgo.toISOString().split("T")[0];
  const endDate = now.toISOString().split("T")[0];

  const url =
    `https://api.stlouisfed.org/fred/series/observations?` +
    `series_id=${seriesId}` +
    `&api_key=${apiKey}` +
    `&file_type=json` +
    `&observation_start=${startDate}` +
    `&observation_end=${endDate}` +
    `&sort_order=asc`;

  let response: FredApiResponse;
  try {
    response = await cachedFetchJson<FredApiResponse>(url);
  } catch (err) {
    throw new Error(
      `Failed to fetch FRED data for series ${seriesId}: ${err instanceof Error ? err.message : String(err)}`
    );
  }

  if (response.error_message) {
    throw new Error(`FRED API error: ${response.error_message}`);
  }

  const observations = response.observations ?? [];
  const dataPoints: TrendDataPoint[] = observations.map((obs) => ({
    date: obs.date,
    value: obs.value === "." ? null : parseFloat(obs.value),
  }));

  return {
    county: countyInfo.name,
    state: state.toUpperCase(),
    metric,
    series_id: seriesId,
    data_points: dataPoints,
    source: `https://fred.stlouisfed.org/series/${seriesId}`,
  };
}
