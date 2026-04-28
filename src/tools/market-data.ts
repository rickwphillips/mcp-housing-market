/**
 * get_market_data tool: fetches current housing market metrics for a county.
 * Data source: Redfin county housing market pages.
 */

import { z } from "zod";
import { lookupCounty, type CountyInfo } from "../data/ma-counties.js";
import { cachedFetch } from "../utils/fetch.js";

export const marketDataSchema = {
  county: z.string().describe("County name (e.g. 'Hampden', 'Suffolk')"),
  state: z
    .string()
    .default("MA")
    .describe("State abbreviation (default: MA)"),
};

export interface MarketData {
  county: string;
  state: string;
  median_home_price: number | null;
  yoy_change_pct: number | null;
  median_days_on_market: number | null;
  active_listings: number | null;
  source: string;
  fetched_at: string;
}

/**
 * Extract a numeric value from Redfin page HTML near a label.
 * Looks for patterns like "$350,000" or "42 days" or "+5.2%".
 */
function extractMetric(
  html: string,
  patterns: RegExp[]
): string | null {
  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (match?.[1]) {
      return match[1];
    }
  }
  return null;
}

function parsePrice(raw: string | null): number | null {
  if (!raw) return null;
  const cleaned = raw.replace(/[$,\s]/g, "");
  const num = parseFloat(cleaned);
  // Handle K/M suffixes
  if (cleaned.endsWith("K") || cleaned.endsWith("k")) {
    return parseFloat(cleaned.slice(0, -1)) * 1000;
  }
  if (cleaned.endsWith("M") || cleaned.endsWith("m")) {
    return parseFloat(cleaned.slice(0, -1)) * 1_000_000;
  }
  return isNaN(num) ? null : num;
}

function parsePercent(raw: string | null): number | null {
  if (!raw) return null;
  const cleaned = raw.replace(/[%\s+]/g, "");
  const num = parseFloat(cleaned);
  return isNaN(num) ? null : num;
}

function parseInteger(raw: string | null): number | null {
  if (!raw) return null;
  const cleaned = raw.replace(/[,\s]/g, "");
  const num = parseInt(cleaned, 10);
  return isNaN(num) ? null : num;
}

/**
 * Fetch market data for a single county.
 */
export async function getMarketData(
  county: string,
  state: string
): Promise<MarketData> {
  const countyInfo: CountyInfo | undefined = lookupCounty(county);

  if (!countyInfo) {
    throw new Error(
      `County "${county}" not found in the lookup table. ` +
        `Supported MA counties: Hampden, Hampshire, Franklin, Berkshire, ` +
        `Middlesex, Suffolk, Norfolk, Essex, Worcester, Plymouth, ` +
        `Barnstable, Bristol, Dukes, Nantucket.`
    );
  }

  const stateAbbr = state.toUpperCase();
  const stateSlug =
    stateAbbr === "MA" ? "Massachusetts" : stateAbbr;
  const url = `https://www.redfin.com/county/${countyInfo.redfinId}/${stateSlug}/${countyInfo.redfinSlug}/housing-market`;

  let html: string;
  try {
    html = await cachedFetch(url);
  } catch (err) {
    throw new Error(
      `Failed to fetch Redfin data for ${countyInfo.name} County: ${err instanceof Error ? err.message : String(err)}`
    );
  }

  // Parse key metrics from the Redfin HTML.
  // Redfin pages embed market stats in various formats; we try multiple patterns.
  const medianPriceRaw = extractMetric(html, [
    /[Mm]edian\s+[Ss]ale\s+[Pp]rice[^$]*\$([\d,]+(?:\.\d+)?[KkMm]?)/,
    /data-rf-test-id="(?:abp-)?median[^"]*"[^>]*>.*?\$([\d,]+(?:\.\d+)?[KkMm]?)/s,
    /\$([\d,]{6,})/,
  ]);

  const yoyRaw = extractMetric(html, [
    /([+-]?\d+\.?\d*)%\s*(?:year|YoY|y\/y)/i,
    /[Yy]ear[- ][Oo]ver[- ][Yy]ear[^%]*?([+-]?\d+\.?\d*)%/,
  ]);

  const daysRaw = extractMetric(html, [
    /[Mm]edian\s+[Dd]ays\s+[Oo]n\s+[Mm]arket[^0-9]*?(\d+)/,
    /(\d+)\s*(?:days?\s+on\s+market|DOM)/i,
  ]);

  const listingsRaw = extractMetric(html, [
    /[Aa]ctive\s+[Ll]istings?[^0-9]*?([\d,]+)/,
    /([\d,]+)\s*(?:active\s+)?(?:homes?\s+)?(?:for\s+sale|listings)/i,
  ]);

  return {
    county: countyInfo.name,
    state: stateAbbr,
    median_home_price: parsePrice(medianPriceRaw),
    yoy_change_pct: parsePercent(yoyRaw),
    median_days_on_market: parseInteger(daysRaw),
    active_listings: parseInteger(listingsRaw),
    source: url,
    fetched_at: new Date().toISOString(),
  };
}
