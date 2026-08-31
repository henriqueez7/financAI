const MAX_AMOUNT_IN_CENTS = 999_999_999_999n;

const MONEY_PATTERN =
  /(?<![\d.,/\-])(?:r\$\s*)?(\d{1,3}(?:\.\d{3})+(?:,\d{1,2})?|\d+(?:[.,]\d{1,2})?)\s*(mil|reais?|contos?)?(?![\d.,/])/i;

export interface MoneyMatch {
  amount: number;
  matchedText: string;
  index: number;
  endIndex: number;
}

export function extractBrazilianMoney(
  text: string,
): MoneyMatch | null {
  const match = MONEY_PATTERN.exec(text);

  if (!match || match.index === undefined || !match[1]) {
    return null;
  }

  const cents = parseAmountToCents(
    match[1],
    match[2]?.toLocaleLowerCase("pt-BR") === "mil",
  );

  if (
    cents === null ||
    cents <= 0n ||
    cents > MAX_AMOUNT_IN_CENTS
  ) {
    return null;
  }

  return {
    amount: Number(cents) / 100,
    matchedText: match[0],
    index: match.index,
    endIndex: match.index + match[0].length,
  };
}

function parseAmountToCents(
  rawAmount: string,
  multiplyByThousand: boolean,
) {
  const decimal = normalizeDecimal(rawAmount);

  if (!decimal) {
    return null;
  }

  const [integerPart, fractionalPart = ""] =
    decimal.split(".");

  if (
    !integerPart ||
    !/^\d+$/.test(integerPart) ||
    !/^\d{0,2}$/.test(fractionalPart)
  ) {
    return null;
  }

  const scale = multiplyByThousand ? 1_000n : 1n;
  const paddedFraction = fractionalPart.padEnd(2, "0");

  return (
    (BigInt(integerPart) * 100n + BigInt(paddedFraction)) *
    scale
  );
}

function normalizeDecimal(rawAmount: string) {
  if (/^\d{1,3}(?:\.\d{3})+(?:,\d{1,2})?$/.test(rawAmount)) {
    return rawAmount.replace(/\./g, "").replace(",", ".");
  }

  if (/^\d+(?:,\d{1,2})?$/.test(rawAmount)) {
    return rawAmount.replace(",", ".");
  }

  if (/^\d+(?:\.\d{1,2})?$/.test(rawAmount)) {
    return rawAmount;
  }

  return null;
}
