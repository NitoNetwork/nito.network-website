import { scaleLinear } from "d3-scale";
import { rewards } from "./data";
import { escape } from "./html";
import type { Copy } from "./content/en";

export function chart(copy: Copy, horizon = 10): string {
  const x = scaleLinear().domain([1, horizon]).range([52, 694]);
  const y = scaleLinear().domain([0, 550]).range([262, 24]);
  const visible = rewards.filter((r) => r.year <= horizon);
  const ranges = visible.map((reward) => {
    const end = Math.min(reward.end, horizon);
    return {
      label: reward.year === end ? `${reward.year}` : `${reward.year}-${end}`,
      reward: reward.reward,
    };
  });
  const accessibleTitle = `${copy.chartTitle} - ${horizon} ${copy.years}`;
  const accessibleDescription = ranges
    .map(({ label, reward }) => `${copy.year} ${label}: ${reward} NITO`)
    .join(". ");
  let path = `M ${x(1)} ${y(512)}`;
  visible.forEach((r, i) => {
    const next = visible[i + 1];
    path += ` H ${x(next ? next.year : horizon)}`;
    if (next) path += ` V ${y(next.reward)}`;
  });
  const ticks =
    horizon === 10
      ? [1, 2, 3, 4, 6, 8, 10]
      : horizon === 50
        ? [1, 10, 20, 30, 40, 50]
        : [1, 50, 100, 150, 200];
  // Reserve the largest responsive label footprint while keeping every data point exact.
  const labels: { x: number; y: number; width: number }[] = [];
  return `<svg viewBox="0 0 720 310" role="img" aria-labelledby="reward-chart-title" aria-describedby="reward-chart-description" class="reward-chart"><title id="reward-chart-title">${escape(accessibleTitle)}</title><desc id="reward-chart-description">${escape(accessibleDescription)}</desc><g aria-hidden="true">
    ${[0, 128, 256, 384, 512].map((v) => `<line class="chart-grid" x1="52" x2="694" y1="${y(v)}" y2="${y(v)}"/>`).join("")}
    <path class="chart-area" d="${path} V 262 H 52 Z"/><path class="chart-line" d="${path}"/>
    ${visible
      .map((r) => {
        const pointX = x(r.year);
        let labelX = pointX > 650 ? pointX - 8 : pointX + 8;
        const anchor = pointX > 650 ? "end" : "start";
        const labelY = Math.max(18, Math.min(258, y(r.reward) - 10));
        for (const previous of labels) {
          if (Math.abs(labelY - previous.y) < 30)
            labelX = Math.max(labelX, previous.x + previous.width + 12);
        }
        labels.push({
          x: labelX,
          y: labelY,
          width: String(r.reward).length * 16,
        });
        return `<circle class="chart-point" cx="${pointX}" cy="${y(r.reward)}" r="4"><title>${copy.year} ${r.year}: ${r.reward} NITO</title></circle><text class="chart-value" x="${labelX}" y="${labelY}" text-anchor="${anchor}">${r.reward}</text>`;
      })
      .join("")}
    ${horizon === 200 ? `<text class="chart-annotation" x="694" y="242" text-anchor="end">2 NITO · 51–200 ${escape(copy.years.toLowerCase())}</text>` : ""}
    ${ticks.map((v) => `<text x="${x(v)}" y="288" text-anchor="middle">${v}</text>`).join("")}
    <text x="694" y="308" text-anchor="end">${escape(copy.years)}</text></g></svg><table class="sr-only chart-data"><caption>${escape(accessibleTitle)}</caption><thead><tr><th scope="col">${escape(copy.years)}</th><th scope="col">${escape(copy.chartUnit)}</th></tr></thead><tbody>${ranges.map(({ label, reward }) => `<tr><th scope="row">${escape(label)}</th><td>${reward}</td></tr>`).join("")}</tbody></table>`;
}
