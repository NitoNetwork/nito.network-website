export const WAVE_DURATION = 9000;
export const BURST_DURATION = 2200;
// Silhouette envelope excludes poster pieces attached only by a luminous bridge.
// The image supplies every color and surface detail inside this runtime clip.
export const LOGO_OUTLINE = [
  [0.178, 0.287],
  [0.377, 0.287],
  [0.601, 0.583],
  [0.601, 0.328],
  [0.646, 0.286],
  [0.821, 0.282],
  [0.824, 0.815],
  [0.835, 0.887],
  [0.603, 0.89],
  [0.44, 0.663],
  [0.44, 0.876],
  [0.411, 0.891],
  [0.18, 0.891],
  [0.184, 0.42],
  [0.198, 0.366],
];
const clamp = (value: number) => Math.max(0, Math.min(1, value));
const smooth = (value: number) => {
  const t = clamp(value);
  return t * t * (3 - 2 * t);
};

// Center lines of the approved artwork, in pen order rather than screen order.
const points = [
  [0.31, 0.875],
  [0.29, 0.315],
  [0.715, 0.875],
  [0.715, 0.315],
];
const segments = points.slice(1).map(([x, y], i) => {
  const [sx, sy] = points[i];
  const dx = x - sx,
    dy = y - sy;
  return { sx, sy, dx, dy, length: Math.hypot(dx, dy) };
});
const totalLength = segments.reduce((sum, segment) => sum + segment.length, 0);

export function strokeAt(x: number, y: number) {
  let nearest = Infinity,
    offset = 0;
  let progress = 0,
    nx = -1,
    ny = 0;
  for (const segment of segments) {
    const { sx, sy, dx, dy, length } = segment;
    const t = clamp(((x - sx) * dx + (y - sy) * dy) / (length * length));
    const px = sx + dx * t,
      py = sy + dy * t;
    const distance = (x - px) ** 2 + (y - py) ** 2;
    if (distance < nearest) {
      nearest = distance;
      progress = (offset + length * t) / totalLength;
      // Peel toward the nearest side of the stroke, including the gold inner edge.
      const side = (x - px) * -dy + (y - py) * dx < 0 ? -1 : 1;
      nx = (-dy / length) * side;
      ny = (dx / length) * side;
    }
    offset += length;
  }
  return { progress, nx, ny };
}

export function createFragment(x: number, y: number, edge: boolean) {
  return {
    x,
    y,
    ...strokeAt(x, y),
    edge,
    spin: Math.sin(x * 157 + y * 113),
    scatterX: 0.07 + (Math.sin(x * 67 + y * 113) * 0.5 + 0.5) * 0.86 - x,
    scatterY: 0.04 + (Math.sin(x * 131 + y * 47) * 0.5 + 0.5) * 0.92 - y,
  };
}
export type Fragment = ReturnType<typeof createFragment>;

export function waveStrength(progress: number, time: number) {
  const separation = Math.abs(
    progress - (time % WAVE_DURATION) / WAVE_DURATION,
  );
  const distance = Math.min(separation, 1 - separation);
  return distance < 0.075
    ? Math.cos(((distance / 0.075) * Math.PI) / 2) ** 2
    : 0;
}

export function fragmentPose(
  tile: Fragment,
  time: number,
  burst: number | null,
) {
  if (burst !== null) {
    const outward = 1 - (1 - clamp(burst / 420)) ** 3;
    const returned = smooth((burst - 500 - tile.progress * 1350) / 350);
    const strength = outward * (1 - returned);
    return {
      x: tile.scatterX * strength,
      y: tile.scatterY * strength,
      angle: tile.spin * strength * 0.7,
      scale: 1 - strength * 0.3,
    };
  }
  const strength = waveStrength(tile.progress, time);
  const lift = tile.edge ? 0.065 + Math.abs(tile.spin) * 0.025 : 0.012;
  return {
    x: tile.nx * strength * lift,
    y: tile.ny * strength * lift - strength * 0.005,
    angle: tile.spin * strength * (tile.edge ? 0.45 : 0.06),
    scale: 1 - strength * (tile.edge ? 0.5 : 0.14),
  };
}

// Runtime mask only: keep the connected N and its antialiasing, not isolated
// fragments baked into the poster. No source image or RGB sample is modified.
export function isolateLogoBody(
  pixels: Uint8ClampedArray,
  width: number,
  height: number,
) {
  const count = width * height;
  const labels = new Int32Array(count),
    queue = new Int32Array(count);
  let label = 0,
    largest = 0,
    largestSize = 0;
  for (let seed = 0; seed < count; seed++) {
    if (labels[seed] || pixels[seed * 4 + 3] < 96) continue;
    label++;
    let head = 0,
      tail = 1;
    queue[0] = seed;
    labels[seed] = label;
    const visit = (p: number) => {
      if (!labels[p] && pixels[p * 4 + 3] >= 96) {
        labels[p] = label;
        queue[tail++] = p;
      }
    };
    while (head < tail) {
      const p = queue[head++],
        x = p % width;
      if (x) visit(p - 1);
      if (x + 1 < width) visit(p + 1);
      if (p >= width) visit(p - width);
      if (p + width < count) visit(p + width);
    }
    if (tail > largestSize) {
      largestSize = tail;
      largest = label;
    }
  }
  const body = new Uint8ClampedArray(pixels);
  for (let p = 0; p < count; p++) {
    if (!body[p * 4 + 3] || (largest && labels[p] === largest)) continue;
    const x = p % width,
      y = Math.floor(p / width);
    let connected = false;
    for (let dy = -2; dy <= 2 && !connected; dy++)
      for (let dx = -2; dx <= 2; dx++) {
        if (x + dx < 0 || x + dx >= width || y + dy < 0 || y + dy >= height)
          continue;
        if (largest && labels[(y + dy) * width + x + dx] === largest) {
          connected = true;
          break;
        }
      }
    if (!connected) body[p * 4 + 3] = 0;
  }
  return body;
}
