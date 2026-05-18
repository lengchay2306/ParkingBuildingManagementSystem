// Pastel maximalism chart helpers — pure SVG, no deps

export function PastelBars() {
  const data = [
    { h: 40, c: "var(--color-pastel-lavender)", l: "06" },
    { h: 62, c: "var(--color-pastel-mint)", l: "08" },
    { h: 78, c: "var(--color-pastel-peach)", l: "10" },
    { h: 95, c: "var(--color-pastel-pink)", l: "12" },
    { h: 88, c: "var(--color-pastel-butter)", l: "14" },
    { h: 70, c: "var(--color-pastel-sky)", l: "16" },
    { h: 84, c: "var(--color-pastel-lavender)", l: "18" },
    { h: 55, c: "var(--color-pastel-mint)", l: "20" },
  ];
  return (
    <div>
      <div className="flex h-40 items-end gap-2">
        {data.map((d, i) => (
          <div key={i} className="flex flex-1 flex-col items-center gap-2">
            <div
              className="w-full rounded-xl"
              style={{ height: `${d.h}%`, background: d.c }}
            />
          </div>
        ))}
      </div>
      <div className="mt-2 flex gap-2">
        {data.map((d) => (
          <span
            key={d.l}
            className="flex-1 text-center font-mono text-[10px] text-muted-foreground"
          >
            {d.l}h
          </span>
        ))}
      </div>
    </div>
  );
}

export function OccupancyRing({
  percent,
  size = 180,
  thickness = 18,
  label,
  sub,
}: {
  percent: number;
  size?: number;
  thickness?: number;
  label: string;
  sub?: string;
}) {
  const r = (size - thickness) / 2;
  const c = 2 * Math.PI * r;
  const offset = c * (1 - percent / 100);
  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <defs>
          <linearGradient id="ringGrad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="var(--color-pastel-lavender)" />
            <stop offset="50%" stopColor="var(--color-pastel-pink)" />
            <stop offset="100%" stopColor="var(--color-pastel-peach)" />
          </linearGradient>
        </defs>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="var(--color-muted)"
          strokeWidth={thickness}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="url(#ringGrad)"
          strokeWidth={thickness}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={offset}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <div className="text-3xl font-bold tracking-tight">{label}</div>
        {sub && (
          <div className="mt-1 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
            {sub}
          </div>
        )}
      </div>
    </div>
  );
}

export function PastelDonut({
  segments,
  size = 140,
}: {
  segments: { value: number; color: string; label: string }[];
  size?: number;
}) {
  const total = segments.reduce((a, b) => a + b.value, 0);
  const r = size / 2 - 16;
  const c = 2 * Math.PI * r;
  let acc = 0;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke="var(--color-muted)"
        strokeWidth={16}
      />
      {segments.map((s, i) => {
        const len = (s.value / total) * c;
        const dash = `${len} ${c - len}`;
        const off = c * 0.25 - acc;
        acc += len;
        return (
          <circle
            key={i}
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke={s.color}
            strokeWidth={16}
            strokeDasharray={dash}
            strokeDashoffset={off}
            strokeLinecap="butt"
          />
        );
      })}
    </svg>
  );
}

export function SparkArea() {
  const pts = [12, 22, 18, 30, 26, 42, 36, 50, 44, 58, 62, 72, 65, 80];
  const w = 320;
  const h = 80;
  const max = Math.max(...pts);
  const step = w / (pts.length - 1);
  const path = pts
    .map((p, i) => `${i === 0 ? "M" : "L"} ${i * step} ${h - (p / max) * h}`)
    .join(" ");
  const fill = `${path} L ${w} ${h} L 0 ${h} Z`;
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="h-20 w-full">
      <defs>
        <linearGradient id="sparkGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--color-pastel-sky)" stopOpacity="0.9" />
          <stop offset="100%" stopColor="var(--color-pastel-sky)" stopOpacity="0.05" />
        </linearGradient>
      </defs>
      <path d={fill} fill="url(#sparkGrad)" />
      <path d={path} fill="none" stroke="var(--color-pastel-lavender)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
