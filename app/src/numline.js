/**
 * One number line for every number + unit + word in the app.
 *
 * Baseline rule
 * -------------
 * Every part of a line shares one alphabetic baseline: the integer,
 * the decimals, ₪, a side word, and any words in the same sentence.
 * Nothing is nudged with translate, a vertical margin, or a different
 * vertical-align. Digit rollers (.dg) carry an invisible strut so their
 * glyph baseline is the element's baseline, the same as plain text.
 *
 * On a big line (hero, meter, grow) the integer is the only in-flow box.
 * Centering the line centers the integer on its axis. Decimals, ₪, and
 * the side word hang off that box at the decimal size (--nl-hang) and
 * sit on the integer's baseline. The side word is the same size as the
 * decimals, on the leading side (physical left).
 *
 * An inline line is plain tabular text. No digit boxes.
 */

export function numLine({
  kind = 'hero',
  int = '',
  dec = '',
  unit = '',
  side = '',
  wordsBefore = '',
  wordsAfter = '',
  roll = '',
  rollDec = '',
  live = '',
  tease = false,
  axis = '',
  cls = '',
} = {}) {
  const axisAttr = axis ? ` data-axis="${axis}"` : '';
  const extra = cls ? ` ${cls}` : '';
  if (kind === 'inline' || kind === 'chip') {
    const liveAttr = live ? ` data-live="${live}"` : '';
    const teaseAttr = tease ? ' data-tease' : '';
    const intHtml = `<span class="inline-num" data-part="int"${liveAttr}${teaseAttr}>${int}</span>`;
    const unitHtml = unit ? `<span class="nl-unit" data-part="unit">${unit}</span>` : '';
    const before = wordsBefore ? `<span data-part="words">${wordsBefore}</span>` : '';
    const after = wordsAfter ? `<span data-part="words">${wordsAfter}</span>` : '';
    const fig = unit ? `<bdi dir="ltr" class="nl-fig">${intHtml} ${unitHtml}</bdi>` : intHtml;
    return `<span class="nl nl-${kind}${extra}" data-numline="${kind}"${axisAttr}>${before}${fig}${after}</span>`;
  }
  const rollAttr = roll ? ` data-roll="${roll}"` : '';
  const rollDecAttr = rollDec ? ` data-roll="${rollDec}"` : '';
  const sideHtml = side ? `<span class="nl-hang nl-side" data-part="side">${side}</span>` : '';
  const decHtml = dec !== '' && dec != null ? `<bdi dir="ltr" class="nl-dec" data-part="dec"${rollDecAttr}>${dec}</bdi>` : '';
  const unitHtml = unit ? `<span class="nl-unit" data-part="unit">${unit}</span>` : '';
  const tail = decHtml || unitHtml ? `<span class="nl-hang nl-tail">${decHtml}${unitHtml}</span>` : '';
  return `<span class="nl nl-${kind} num-ltr${extra}" dir="ltr" data-numline="${kind}"${axisAttr}>${sideHtml}<bdi dir="ltr" class="nl-int" data-part="int"${rollAttr}>${int}</bdi>${tail}</span>`;
}
