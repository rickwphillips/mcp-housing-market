# @rickwphillips/mcp-housing-market

A [Model Context Protocol](https://modelcontextprotocol.io/) (MCP) server that provides housing market data tools for Massachusetts counties. Connects AI assistants to real-time housing market data from Redfin and historical data from the FRED API.

## Features

- **Live market data** from Redfin for all 14 Massachusetts counties
- **Regional comparisons** between groups of counties (e.g. western MA vs eastern MA)
- **Historical trends** via the FRED API (median prices, days on market, inventory)
- **Affordability calculator** using the 28% DTI rule with configurable parameters
- Built-in response caching (1 hour TTL) to minimize external requests

## Installation

### From npm

```bash
npm install -g @rickwphillips/mcp-housing-market
```

### From source

```bash
git clone https://github.com/rickwphillips/mcp-housing-market.git
cd mcp-housing-market
npm install
npm run build
```

## Configuration

### Claude Desktop

Add to your `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "housing-market": {
      "command": "npx",
      "args": ["-y", "@rickwphillips/mcp-housing-market"],
      "env": {
        "FRED_API_KEY": "your-fred-api-key-here"
      }
    }
  }
}
```

### Claude Code

Add to your project's `.mcp.json`:

```json
{
  "mcpServers": {
    "housing-market": {
      "command": "node",
      "args": ["/path/to/mcp-housing-market/dist/index.js"],
      "env": {
        "FRED_API_KEY": "your-fred-api-key-here"
      }
    }
  }
}
```

### Environment Variables

| Variable | Required | Description |
|---|---|---|
| `FRED_API_KEY` | For `price_trends` tool | Free API key from [FRED](https://fred.stlouisfed.org/docs/api/api_key.html) |

## Tools

### `get_market_data`

Fetch current housing market metrics for a Massachusetts county.

**Parameters:**
- `county` (string, required): County name, e.g. "Hampden", "Suffolk"
- `state` (string, default: "MA"): State abbreviation

**Returns:** Median home price, year-over-year change %, median days on market, active listings count.

**Example query:** "What's the current housing market like in Hampshire County?"

### `compare_regions`

Compare housing market metrics between two groups of counties.

**Parameters:**
- `region_a` (string, required): Comma-separated county names for region A
- `region_b` (string, required): Comma-separated county names for region B
- `state` (string, default: "MA"): State abbreviation

**Returns:** Average metrics for each region plus price differential and ratio.

**Example query:** "Compare the 413 area (Hampden, Hampshire, Franklin) to greater Boston (Suffolk, Middlesex, Norfolk)."

### `price_trends`

Fetch the last 12 months of historical housing data from the FRED API.

**Parameters:**
- `county` (string, required): County name
- `state` (string, default: "MA"): State abbreviation
- `metric` (enum, required): One of `median_price`, `days_on_market`, `inventory`

**Returns:** Array of date/value data points for the chosen metric.

**Example query:** "Show me the median price trend for Worcester County over the past year."

### `affordability_check`

Calculate home affordability based on income using the 28% debt-to-income rule.

**Parameters:**
- `annual_income` (number, required): Gross annual household income
- `county` (string, required): County name
- `state` (string, default: "MA"): State abbreviation
- `down_payment_pct` (number, default: 20): Down payment percentage
- `interest_rate` (number, default: 6.5): Annual mortgage interest rate

**Returns:** Max affordable price, monthly payment at the county median, whether the median is affordable, and the gap or surplus.

**Example query:** "Can a household earning $85,000/year afford a home in Hampden County with 10% down?"

## Supported Counties

All 14 Massachusetts counties are supported:

Barnstable, Berkshire, Bristol, Dukes, Essex, Franklin, Hampden, Hampshire, Middlesex, Nantucket, Norfolk, Plymouth, Suffolk, Worcester

## Development

```bash
# Install dependencies
npm install

# Build
npm run build

# Run in dev mode (uses tsx)
npm run dev

# Test the server
echo '{"jsonrpc":"2.0","method":"initialize","params":{"protocolVersion":"2024-11-05","capabilities":{},"clientInfo":{"name":"test","version":"1.0.0"}},"id":1}' | node dist/index.js
```

## Architecture

```
src/
  index.ts                 # MCP server setup, tool registration
  tools/
    market-data.ts         # get_market_data (Redfin scraping)
    compare.ts             # compare_regions (multi-county aggregation)
    trends.ts              # price_trends (FRED API)
    affordability.ts       # affordability_check (DTI calculator)
  data/
    ma-counties.ts         # County lookup table (names, FIPS, Redfin IDs)
  utils/
    fetch.ts               # Cached fetch with error handling
```

## Data Sources

- **Redfin**: Current market metrics (median price, DOM, listings). Data is scraped from county housing market pages.
- **FRED (Federal Reserve Economic Data)**: Historical time series data. Requires a free API key.

## License

MIT
