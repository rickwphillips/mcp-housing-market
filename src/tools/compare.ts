/**
 * compare_regions tool: compares housing market metrics between two groups of counties.
 * Great for "western MA vs eastern MA" type queries.
 */

import { z } from "zod";
import { getMarketData, type MarketData } from "./market-data.js";

export const compareRegionsSchema = {
  region_a: z
    .string()
    .describe(
      "Comma-separated county names for region A (e.g. 'Hampden, Hampshire, Franklin')"
    ),
  region_b: z
    .string()
    .describe(
      "Comma-separated county names for region B (e.g. 'Suffolk, Middlesex, Norfolk')"
    ),
  state: z
    .string()
    .default("MA")
    .describe("State abbreviation (default: MA)"),
};

interface RegionSummary {
  counties: string[];
  avg_median_price: number | null;
  avg_yoy_change_pct: number | null;
  avg_days_on_market: number | null;
  total_active_listings: number | null;
  individual_data: MarketData[];
}

export interface CompareResult {
  region_a: RegionSummary;
  region_b: RegionSummary;
  price_difference: number | null;
  price_ratio: string | null;
}

function parseCountyList(input: string): string[] {
  return input
    .split(",")
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

function avg(values: (number | null)[]): number | null {
  const valid = values.filter((v): v is number => v !== null);
  if (valid.length === 0) return null;
  return Math.round(valid.reduce((a, b) => a + b, 0) / valid.length);
}

function sum(values: (number | null)[]): number | null {
  const valid = values.filter((v): v is number => v !== null);
  if (valid.length === 0) return null;
  return valid.reduce((a, b) => a + b, 0);
}

async function summarizeRegion(
  countyNames: string[],
  state: string
): Promise<RegionSummary> {
  const results: MarketData[] = [];
  const errors: string[] = [];

  for (const name of countyNames) {
    try {
      const data = await getMarketData(name, state);
      results.push(data);
    } catch (err) {
      errors.push(
        `${name}: ${err instanceof Error ? err.message : String(err)}`
      );
    }
  }

  if (results.length === 0 && errors.length > 0) {
    throw new Error(
      `Failed to fetch data for all counties: ${errors.join("; ")}`
    );
  }

  return {
    counties: results.map((r) => r.county),
    avg_median_price: avg(results.map((r) => r.median_home_price)),
    avg_yoy_change_pct: avg(results.map((r) => r.yoy_change_pct)),
    avg_days_on_market: avg(results.map((r) => r.median_days_on_market)),
    total_active_listings: sum(results.map((r) => r.active_listings)),
    individual_data: results,
  };
}

/**
 * Compare two regions (groups of counties) on housing market metrics.
 */
export async function compareRegions(
  regionA: string,
  regionB: string,
  state: string
): Promise<CompareResult> {
  const countiesA = parseCountyList(regionA);
  const countiesB = parseCountyList(regionB);

  if (countiesA.length === 0) {
    throw new Error("region_a must contain at least one county name.");
  }
  if (countiesB.length === 0) {
    throw new Error("region_b must contain at least one county name.");
  }

  const [summaryA, summaryB] = await Promise.all([
    summarizeRegion(countiesA, state),
    summarizeRegion(countiesB, state),
  ]);

  let priceDifference: number | null = null;
  let priceRatio: string | null = null;

  if (
    summaryA.avg_median_price !== null &&
    summaryB.avg_median_price !== null
  ) {
    priceDifference = summaryB.avg_median_price - summaryA.avg_median_price;
    if (summaryA.avg_median_price > 0) {
      const ratio = summaryB.avg_median_price / summaryA.avg_median_price;
      priceRatio = `${ratio.toFixed(2)}x`;
    }
  }

  return {
    region_a: summaryA,
    region_b: summaryB,
    price_difference: priceDifference,
    price_ratio: priceRatio,
  };
}
