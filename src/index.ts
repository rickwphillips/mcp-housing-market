#!/usr/bin/env node

/**
 * MCP Housing Market Server
 *
 * A Model Context Protocol server that provides housing market data tools
 * for Massachusetts counties. Supports market data lookup, regional comparison,
 * historical trends (via FRED API), and affordability calculations.
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";

import { marketDataSchema, getMarketData } from "./tools/market-data.js";
import { compareRegionsSchema, compareRegions } from "./tools/compare.js";
import { priceTrendsSchema, getPriceTrends } from "./tools/trends.js";
import {
  affordabilitySchema,
  checkAffordability,
} from "./tools/affordability.js";

const server = new McpServer({
  name: "housing-market",
  version: "1.0.0",
});

// --- Tool: get_market_data ---
server.tool(
  "get_market_data",
  "Fetch current housing market metrics for a Massachusetts county. " +
    "Returns median home price, year-over-year change, median days on market, " +
    "and active listings count. Data sourced from Redfin.",
  marketDataSchema,
  async (args) => {
    try {
      const result = await getMarketData(args.county, args.state);
      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(result, null, 2),
          },
        ],
      };
    } catch (err) {
      return {
        content: [
          {
            type: "text" as const,
            text: `Error: ${err instanceof Error ? err.message : String(err)}`,
          },
        ],
        isError: true,
      };
    }
  }
);

// --- Tool: compare_regions ---
server.tool(
  "compare_regions",
  "Compare housing market metrics between two groups of counties. " +
    "Provide comma-separated county names for each region. " +
    "Returns average metrics for each region and the price differential. " +
    "Ideal for queries like '413 area vs eastern MA'.",
  compareRegionsSchema,
  async (args) => {
    try {
      const result = await compareRegions(
        args.region_a,
        args.region_b,
        args.state
      );
      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(result, null, 2),
          },
        ],
      };
    } catch (err) {
      return {
        content: [
          {
            type: "text" as const,
            text: `Error: ${err instanceof Error ? err.message : String(err)}`,
          },
        ],
        isError: true,
      };
    }
  }
);

// --- Tool: price_trends ---
server.tool(
  "price_trends",
  "Fetch historical housing data from the FRED API for a Massachusetts county. " +
    "Returns the last 12 months of data for the chosen metric. " +
    "Requires FRED_API_KEY environment variable (free at https://fred.stlouisfed.org/docs/api/api_key.html).",
  priceTrendsSchema,
  async (args) => {
    try {
      const result = await getPriceTrends(
        args.county,
        args.state,
        args.metric
      );
      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(result, null, 2),
          },
        ],
      };
    } catch (err) {
      return {
        content: [
          {
            type: "text" as const,
            text: `Error: ${err instanceof Error ? err.message : String(err)}`,
          },
        ],
        isError: true,
      };
    }
  }
);

// --- Tool: affordability_check ---
server.tool(
  "affordability_check",
  "Calculate whether a home in a given county is affordable based on income. " +
    "Uses the 28% debt-to-income ratio rule with a 30-year fixed mortgage. " +
    "Returns max affordable price, monthly payment, and a comparison to the county median.",
  affordabilitySchema,
  async (args) => {
    try {
      const result = await checkAffordability(
        args.annual_income,
        args.county,
        args.state,
        args.down_payment_pct,
        args.interest_rate
      );
      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(result, null, 2),
          },
        ],
      };
    } catch (err) {
      return {
        content: [
          {
            type: "text" as const,
            text: `Error: ${err instanceof Error ? err.message : String(err)}`,
          },
        ],
        isError: true,
      };
    }
  }
);

// --- Start the server ---
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((err) => {
  console.error("Fatal error starting MCP server:", err);
  process.exit(1);
});
