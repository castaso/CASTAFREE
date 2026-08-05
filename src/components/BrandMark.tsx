/**
 * BrandMark — the CASTASOFT logo.
 *
 * Renders the official brand SVG. The source file's Inkscape canvas offset
 * (translate(-389.213, -460.12)) is baked directly into the path
 * coordinates so the artwork sits inside a tight viewBox with no dead space.
 *
 * Colors: amber #FAA61A + dark indigo #303188.
 */
export function BrandMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="-1 -1 92 81"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      role="img"
      aria-label="CASTASOFT"
    >
      <path
        d="m 69.89,57.42 c 0,-7.08 0,-57.41 0,-57.41 h 12.63 c 0,16.39 0,47.2 0,61 0,11.76 0.42,12.51 5.19,13.82 l 1.78,0.39 c 0.78,0.9 0.52,3.1 -0.52,3.75 -5.43,-0.26 -10.6,-0.39 -16.8,-0.39 -6.59,0 -11.89,0.13 -15.9,0.39 -1.55,-0.65 -1.42,-2.97 -0.39,-3.75 l 3.49,-0.52 c 0.01,0 10.52,-0.06 10.52,-17.28 z"
        fill="#FAA61A"
      />
      <path
        d="m 69.89,0 -52.2,64.1 c -5.1,6.25 -8.53,9.82 -13.7,10.6 l -3.23,0.52 c -1.03,0.77 -1.03,2.97 0.13,3.75 4.27,-0.26 8.66,-0.39 13.44,-0.39 5.3,0 9.44,0.13 14.86,0.39 1.16,-0.78 1.42,-2.97 0.39,-3.75 l -4.14,-0.78 c -2.32,-0.39 -4.11,-1.11 -4.61,-3.19 -0.22,-0.88 -0.34,-2.21 4.14,-8.01 3.39,-4.39 44.93,-54.67 44.93,-54.67 v -8.57 z"
        fill="#303188"
      />
    </svg>
  );
}
