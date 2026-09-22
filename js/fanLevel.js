/**
 * FanWarsIndia — Fan level logic
 * Cumulative contribution amount -> fan level. Reusable everywhere a level
 * needs to be derived (support flow, fan card, future profile pages).
 */

const FAN_LEVELS = [
  { key: "supporter", label: "Supporter", min: 1, max: 99, color: "#8A8A8A" },
  { key: "fan", label: "Fan", min: 100, max: 499, color: "#E5484D" },
  { key: "superfan", label: "Superfan", min: 500, max: 1999, color: "#FF1A1A" },
  { key: "diehard", label: "Die-hard", min: 2000, max: 9999, color: "#FF4D4D" },
  { key: "legend", label: "Legend", min: 10000, max: Infinity, color: "#FFD34D" },
];

function getFanLevel(cumulativeAmount) {
  const amount = Math.max(0, cumulativeAmount || 0);
  return (
    FAN_LEVELS.find((level) => amount >= level.min && amount <= level.max) ||
    FAN_LEVELS[0]
  );
}

function getNextFanLevel(cumulativeAmount) {
  const current = getFanLevel(cumulativeAmount);
  const idx = FAN_LEVELS.findIndex((l) => l.key === current.key);
  return FAN_LEVELS[idx + 1] || null;
}
