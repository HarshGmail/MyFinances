import axios from 'axios';

const FUND_STOP_WORDS = new Set([
  'fund',
  'funds',
  'plan',
  'option',
  'direct',
  'growth',
  'regular',
  'idcw',
  'reinvestment',
  'payout',
  'series',
  'and',
  'of',
  'the',
  'fof',
  'etf',
  'nfo',
  'scheme',
  'class',
]);

export function normalizeFundName(name: string): string[] {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 1 && !FUND_STOP_WORDS.has(w));
}

export function fundNameSimilarity(a: string, b: string): number {
  const wordsA = new Set(normalizeFundName(a));
  const wordsB = new Set(normalizeFundName(b));
  if (wordsA.size === 0 || wordsB.size === 0) return 0;
  const intersection = [...wordsA].filter((w) => wordsB.has(w)).length;
  const union = new Set([...wordsA, ...wordsB]).size;
  return intersection / union;
}

export function wordRecall(query: string, candidate: string): number {
  const queryWords = new Set(normalizeFundName(query));
  const candidateWords = new Set(normalizeFundName(candidate));
  if (queryWords.size === 0) return 0;
  const matched = [...queryWords].filter((w) => candidateWords.has(w)).length;
  return matched / queryWords.size;
}

// Module-level cache so the full MFAPI list is only fetched once per server lifetime
let mfapiAllFundsCache: { schemeCode: number; schemeName: string }[] | null = null;

export async function getMFAPIAllFunds(): Promise<{ schemeCode: number; schemeName: string }[]> {
  if (mfapiAllFundsCache) return mfapiAllFundsCache;
  try {
    const res =
      await axios.get<{ schemeCode: number; schemeName: string }[]>('https://api.mfapi.in/mf');
    mfapiAllFundsCache = res.data;
    return mfapiAllFundsCache;
  } catch {
    return [];
  }
}

/** Find the best-matching MFAPI Direct Growth scheme for a given fund name. */
export async function lookupMFAPIScheme(
  name: string
): Promise<{ schemeName: string; schemeCode: number } | null> {
  const allFunds = await getMFAPIAllFunds();
  if (allFunds.length === 0) return null;

  // Prefer Direct Growth schemes
  const directFunds = allFunds.filter((f) => {
    const l = f.schemeName.toLowerCase();
    return (
      l.includes('direct') && (l.includes('growth') || l.includes(' gr ') || l.endsWith(' gr'))
    );
  });

  const search = (pool: typeof allFunds) => {
    let best: { schemeName: string; schemeCode: number } | null = null;
    let bestScore = 0;
    for (const fund of pool) {
      const jaccard = fundNameSimilarity(name, fund.schemeName);
      const recall = wordRecall(name, fund.schemeName);
      const score = jaccard >= 0.6 ? jaccard : recall >= 1.0 ? 0.55 + recall * 0.1 : 0;
      if (score > bestScore) {
        bestScore = score;
        best = { schemeName: fund.schemeName, schemeCode: fund.schemeCode };
      }
    }
    return bestScore > 0 ? best : null;
  };

  return search(directFunds) ?? search(allFunds);
}
