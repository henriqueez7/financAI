export function normalizeRawText(text: string) {
  return text.replace(/\s+/g, " ").trim();
}

export function normalizeForMatching(text: string) {
  return removeDiacritics(text)
    .toLocaleLowerCase("pt-BR")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function isLabelGrounded(
  label: string,
  sourceText: string,
) {
  const normalizedLabel = normalizeForMatching(label);
  const normalizedSource = normalizeForMatching(sourceText);

  if (!normalizedLabel || !normalizedSource) {
    return false;
  }

  if (normalizedSource.includes(normalizedLabel)) {
    return true;
  }

  const significantTokens = normalizedLabel
    .split(" ")
    .filter((token) => token.length >= 3);

  return (
    significantTokens.length > 0 &&
    significantTokens.every((token) =>
      normalizedSource.split(" ").includes(token),
    )
  );
}

function removeDiacritics(text: string) {
  return text
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "");
}
