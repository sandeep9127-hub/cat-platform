/**
 * The 12 Sustainable Development Goals CAT contributes to, per the
 * agroecologyindia.org "Our commitment to SDGs" section.
 *
 * Rendered as styled circles in the canonical UN palette with the goal
 * number and a short editorial label. The colour values are the publicly
 * published UN SDG colour palette.
 */

export type Sdg = {
  number: number;
  /** Short editorial label, plain language. */
  label: string;
  /** Canonical UN SDG hex. */
  colour: string;
};

export const SDGS: Sdg[] = [
  { number: 1, label: "No poverty", colour: "#E5243B" },
  { number: 2, label: "Zero hunger", colour: "#DDA63A" },
  { number: 3, label: "Good health and well-being", colour: "#4C9F38" },
  { number: 8, label: "Decent work and economic growth", colour: "#A21942" },
  { number: 10, label: "Reduced inequalities", colour: "#DD1367" },
  { number: 11, label: "Sustainable cities and communities", colour: "#FD9D24" },
  { number: 12, label: "Responsible consumption and production", colour: "#BF8B2E" },
  { number: 13, label: "Climate action", colour: "#3F7E44" },
  { number: 14, label: "Life below water", colour: "#0A97D9" },
  { number: 15, label: "Life on land", colour: "#56C02B" },
  { number: 16, label: "Peace, justice and strong institutions", colour: "#00689D" },
  { number: 17, label: "Partnerships for the goals", colour: "#19486A" },
];
