import axios from 'axios';

export interface WorldBankMeta {
  page: number;
  pages: number;
  per_page: number;
  total: number;
  sourceid: string;
  lastupdated: string; // ISO date
}

export interface WorldBankIndicatorRef {
  id: string; // e.g., "FP.CPI.TOTL.ZG"
  value: string; // e.g., "Inflation, consumer prices (annual %)"
}

export interface WorldBankCountryRef {
  id: string; // e.g., "IN"
  value: string; // e.g., "India"
}

export interface WorldBankDataPoint {
  indicator: WorldBankIndicatorRef;
  country: WorldBankCountryRef;
  countryiso3code: string; // "IND"
  date: string; // "YYYY"
  value: number | null; // may be null for some years
  unit: string;
  obs_status: string;
  decimal: number;
}

/** The v2 API returns a 2-element array: [meta, data[]] */
export type WorldBankApiResponse = [WorldBankMeta, WorldBankDataPoint[]];

export interface InflationResult {
  meta: WorldBankMeta;
  data: WorldBankDataPoint[];
  /** Convenience: sorted (most recent first) year/value pairs */
  tidy: Array<{ year: number; value: number | null }>;
  /** Convenience: average of non-null values in the set (percent) */
  average?: number;
}

class InflationService {
  private readonly baseUrl = 'https://api.worldbank.org/v2';
  private readonly defaultIndicator = 'FP.CPI.TOTL.ZG'; // CPI inflation (%)
  private readonly defaultCountry = 'IND';

  /**
   * Fetch CPI inflation series from the World Bank API.
   * @param params.country ISO2/ISO3 accepted by the API (default "IND")
   * @param params.indicator Indicator code (default "FP.CPI.TOTL.ZG")
   * @param params.perPage Number of rows (use this for "numOfYears")
   */
  async getInflationSeries(params: {
    country?: string;
    indicator?: string;
    perPage: number;
  }): Promise<InflationResult> {
    const country = params.country ?? this.defaultCountry;
    const indicator = params.indicator ?? this.defaultIndicator;
    const perPage = Math.min(Math.max(params.perPage || 5, 1), 200); // clamp

    const url = `${this.baseUrl}/country/${country}/indicator/${indicator}`;

    try {
      const response = await axios.get<WorldBankApiResponse>(url, {
        params: { format: 'json', per_page: perPage },
        timeout: 15_000,
      });

      const json = response.data;

      if (!Array.isArray(json) || json.length !== 2 || !Array.isArray(json[1])) {
        throw new Error('Unexpected response structure from World Bank API');
      }

      const [meta, data] = json;

      // Sort newest first (API typically returns this already)
      const sorted = [...data].sort((a, b) => Number(b.date) - Number(a.date));

      // Build a tidy array and compute average over available values
      const tidy = sorted.map((d) => ({
        year: Number(d.date),
        value: d.value == null ? null : Number(d.value),
      }));
      const nonNull = tidy.filter((d) => d.value != null) as Array<{ year: number; value: number }>;
      const average =
        nonNull.length > 0 ? nonNull.reduce((s, d) => s + d.value, 0) / nonNull.length : undefined;

      return { meta, data: sorted, tidy, average };
    } catch (err: unknown) {
      throw new Error((err as Error).message);
    }
  }

  /**
   * Convenience method for India with just "numOfYears".
   */
  async getIndiaInflationYears(numOfYears: number): Promise<InflationResult> {
    return this.getInflationSeries({ perPage: numOfYears });
  }
}

export default new InflationService();
