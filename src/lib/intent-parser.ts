import type { StructuredIntent } from "./llm";

const injectionPattern =
  /ignore\s+(?:all|any|the|user'?s|previous|prior|original)\s+(?:instructions?|mandates?|requests?|limits?|rules?)|override\s+(?:the|user|payment|system)\s+(?:limit|policy|mandate|instruction)|disregard\s+(?:the|user'?s?)\s+(?:request|limit|policy|intent|instruction)|send\s+funds\s+to\s+(?:an\s+)?unknown|system\s*override|purchase\s+(?:the\s+)?most\s+expensive/i;

export function parseIntent(input: string): StructuredIntent & { promptInjection: boolean } {
  const amountMatch = input.match(/(?:under|below|less than|maximum|max)\s*[₹$]?\s*([\d,]+)/i);
  const merchantMatch = input.match(/\bfrom\s+([A-Za-z0-9][A-Za-z0-9 .&'-]{1,80}?)(?:\s+and\b|\s+but\b|\s*$|\.)/i);
  const productMatch = input.match(/(?:buy|purchase|get|book)\s+(?:me\s+)?(?:a|an|the|one)\s+([A-Za-z][A-Za-z0-9 -]{1,50}?)(?:\s+under\b|\s+below\b|\s+from\b|\s*$|\.)/i);
  const excludedMatch = input.match(/(?:(?:do\s+)?not|don['’]t)\s+(?:buy|purchase)\s+anything\s+([^.,]+)/i);
  const currency = /₹|INR|rupee/i.test(input) ? "INR" : /\$|USD|dollar/i.test(input) ? "USD" : "INR";
  return { product: productMatch?.[1]?.trim(), maxAmount: amountMatch ? Number(amountMatch[1].replace(/,/g, "")) : undefined, currency, merchant: merchantMatch?.[1]?.trim(), excludedConditions: excludedMatch?.[1] ? [excludedMatch[1].trim()] : [], category: /laptop|headphones|electronics/i.test(input) ? "Electronics" : undefined, promptInjection: injectionPattern.test(input) };
}

export function containsPromptInjection(input: string) {
  return injectionPattern.test(input);
}
