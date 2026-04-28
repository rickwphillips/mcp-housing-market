/**
 * affordability_check tool: calculates whether a home in a given county
 * is affordable based on income and the 28% DTI rule.
 */

import { z } from "zod";
import { getMarketData } from "./market-data.js";

export const affordabilitySchema = {
  annual_income: z
    .number()
    .positive()
    .describe("Gross annual household income in dollars"),
  county: z.string().describe("County name (e.g. 'Hampden', 'Suffolk')"),
  state: z
    .string()
    .default("MA")
    .describe("State abbreviation (default: MA)"),
  down_payment_pct: z
    .number()
    .min(0)
    .max(100)
    .default(20)
    .describe("Down payment percentage (default: 20)"),
  interest_rate: z
    .number()
    .min(0)
    .max(30)
    .default(6.5)
    .describe("Annual mortgage interest rate as a percentage (default: 6.5)"),
};

export interface AffordabilityResult {
  county: string;
  state: string;
  annual_income: number;
  max_monthly_housing_payment: number;
  max_affordable_price: number;
  median_price: number | null;
  affordable: boolean | null;
  monthly_payment: number | null;
  gap_or_surplus: number | null;
  assumptions: {
    dti_ratio: number;
    down_payment_pct: number;
    interest_rate: number;
    loan_term_years: number;
  };
}

/**
 * Calculate the monthly mortgage payment using the standard amortization formula.
 * P = L * [r(1+r)^n] / [(1+r)^n - 1]
 * where L = loan amount, r = monthly rate, n = total payments
 */
function calculateMonthlyPayment(
  loanAmount: number,
  annualRate: number,
  termYears: number
): number {
  const monthlyRate = annualRate / 100 / 12;
  const totalPayments = termYears * 12;

  if (monthlyRate === 0) {
    return loanAmount / totalPayments;
  }

  const factor = Math.pow(1 + monthlyRate, totalPayments);
  return loanAmount * (monthlyRate * factor) / (factor - 1);
}

/**
 * Calculate the maximum loan amount that results in a given monthly payment.
 * Inverse of the amortization formula.
 */
function maxLoanFromPayment(
  monthlyPayment: number,
  annualRate: number,
  termYears: number
): number {
  const monthlyRate = annualRate / 100 / 12;
  const totalPayments = termYears * 12;

  if (monthlyRate === 0) {
    return monthlyPayment * totalPayments;
  }

  const factor = Math.pow(1 + monthlyRate, totalPayments);
  return monthlyPayment * (factor - 1) / (monthlyRate * factor);
}

/**
 * Check housing affordability for a given income and county.
 */
export async function checkAffordability(
  annualIncome: number,
  county: string,
  state: string,
  downPaymentPct: number,
  interestRate: number
): Promise<AffordabilityResult> {
  const LOAN_TERM_YEARS = 30;
  const DTI_RATIO = 0.28;

  // Max monthly payment based on 28% DTI rule
  const maxMonthly = (annualIncome / 12) * DTI_RATIO;

  // Max loan amount that fits within that monthly payment
  const maxLoan = maxLoanFromPayment(
    maxMonthly,
    interestRate,
    LOAN_TERM_YEARS
  );

  // Max home price = loan / (1 - down payment fraction)
  const downFraction = downPaymentPct / 100;
  const maxAffordablePrice = Math.round(maxLoan / (1 - downFraction));

  // Fetch current median price for the county
  let medianPrice: number | null = null;
  try {
    const marketData = await getMarketData(county, state);
    medianPrice = marketData.median_home_price;
  } catch {
    // If we cannot fetch market data, we still return the affordability calc
    // with median_price as null.
  }

  let affordable: boolean | null = null;
  let monthlyPayment: number | null = null;
  let gapOrSurplus: number | null = null;

  if (medianPrice !== null) {
    affordable = maxAffordablePrice >= medianPrice;
    const loanForMedian = medianPrice * (1 - downFraction);
    monthlyPayment = Math.round(
      calculateMonthlyPayment(loanForMedian, interestRate, LOAN_TERM_YEARS)
    );
    gapOrSurplus = maxAffordablePrice - medianPrice;
  }

  const countyData = await (async () => {
    try {
      const md = await getMarketData(county, state);
      return md.county;
    } catch {
      return county;
    }
  })();

  return {
    county: countyData,
    state: state.toUpperCase(),
    annual_income: annualIncome,
    max_monthly_housing_payment: Math.round(maxMonthly),
    max_affordable_price: maxAffordablePrice,
    median_price: medianPrice,
    affordable,
    monthly_payment: monthlyPayment,
    gap_or_surplus: gapOrSurplus,
    assumptions: {
      dti_ratio: DTI_RATIO,
      down_payment_pct: downPaymentPct,
      interest_rate: interestRate,
      loan_term_years: LOAN_TERM_YEARS,
    },
  };
}
