# Solution fact-sheet illustrations

Line-and-wash drawings in CAT colours (forest pencil line, flat CAT-tint
washes, no people, no words inside drawings), one per Solutions Atlas theme,
plus the eight CAT pathway drawings used as small markers on the fact sheet.

Rendered files live in `public/illustrations/solutions/` (`<theme>.webp`) and
`public/illustrations/solutions/icons/` (`<pathway>.webp`). The page picks the
drawing for the sheet's first theme (`app/(public)/factsheet/[slug]/page.tsx`).

## Re-rendering

These scene files are written for the `line-and-wash` skill's plate engine.

1. Start a plate project: `sh ~/.claude/skills/line-and-wash/scripts/new.sh <dir>`
2. Copy a scene here into `<dir>/scenes/sN.js`.
3. Render on white at 2x:
   `node ~/.claude/skills/line-and-wash/scripts/plate.mjs <dir> N --page 1600x700 --out 2 --paper white`
   (icons: `--page 1920x560`).
4. Convert white to transparency, trim, resize to 1000px wide and save as
   WebP (quality ~78), as done for the files in `public/illustrations/solutions/`.
