/**
 * The road key of an exact address: everything before its first digit.
 *
 * `台南市中西區民生路二段5號3樓` -> `台南市中西區民生路二段`
 *
 * Road keys are the only granularity the geocoder can resolve for this
 * dataset (specification 3.1); house numbers here are synthetic. Section
 * numbers are spelled in Chinese numerals, so they survive the truncation and
 * 一段 stays distinct from 二段.
 */
export function roadKeyOf(address: string): string {
  const firstDigit = address.search(/[0-9]/);
  return firstDigit === -1 ? address : address.slice(0, firstDigit);
}
