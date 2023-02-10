const lengths = {
  1: "190",
  2: "250",
  3: "330",
};
const clipWidth = {
  1: "100",
  2: "106",
  3: "114",
};
const rectWidths = {
  1: "29",
  2: "35",
  3: "43",
};
const colors = {
  10: "#e05d44", // red
  20: "#fe7d37", // orange
  40: "#dfb317", // yellow
  60: "#a4a61d", // yellowgreen
  80: "#97ca00", // green
  100: "#4c1", // success
};
// https://shields.io/
export const generateBadge = (coverage: number) => {
  const textLength = lengths[String(coverage).length];
  const clipPathWidth = clipWidth[String(coverage).length];
  const rectWidth = rectWidths[String(coverage).length];

  const colorKey = Object.keys(colors).find((x) => Number(x) >= coverage);
  const color = colors[colorKey];

  return `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${clipPathWidth}" height="20" role="img" aria-label="COVERAGE: ${coverage}%">
      <title>COVERAGE: ${coverage}%</title>
      <linearGradient id="s" x2="0" y2="100%">
        <stop offset="0" stop-color="#bbb" stop-opacity=".1"/>
        <stop offset="1" stop-opacity=".1"/>
      </linearGradient>
      <clipPath id="r">
        <rect width="${clipPathWidth}" height="20" rx="3" fill="#fff"/>
      </clipPath>
      <g clip-path="url(#r)">
        <rect width="71" height="20" fill="#555"/>
        <rect x="71" width="${rectWidth}" height="20" fill="${color}"/>
        <rect width="${clipPathWidth}" height="20" fill="url(#s)"/>
      </g>
      <g fill="#fff" text-anchor="middle" font-family="Verdana,Geneva,DejaVu Sans,sans-serif" text-rendering="geometricPrecision" font-size="110">
        <text aria-hidden="true" x="365" y="150" fill="#010101" fill-opacity=".3" transform="scale(.1)" textLength="610">COVERAGE</text>
        <text x="365" y="140" transform="scale(.1)" fill="#fff" textLength="610">COVERAGE</text>
        <text aria-hidden="true" x="915" y="150" fill="#010101" fill-opacity=".3" transform="scale(.1)" textLength="${textLength}">${coverage}%</text>
        <text x="915" y="140" transform="scale(.1)" fill="#fff" textLength="${textLength}">${coverage}%</text>
      </g>
    </svg>`;
};
