import { useState } from 'react';

interface ViewsPoint {
  date: string;
  label: string;
  views: number;
}

interface ClicksBarItem {
  id: string;
  title: string;
  platform: string;
  clicks: number;
}

export function ViewsLineChart({ data }: { data: ViewsPoint[] }) {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  if (!data || data.length === 0) {
    return (
      <div className="h-56 flex items-center justify-center text-sm text-slate-400">
        No view history available yet.
      </div>
    );
  }

  const width = 600;
  const height = 220;
  const padLeft = 38;
  const padRight = 18;
  const padTop = 20;
  const padBottom = 34;

  const maxVal = Math.max(5, ...data.map((d) => d.views));
  const chartW = width - padLeft - padRight;
  const chartH = height - padTop - padBottom;

  const coords = data.map((d, idx) => {
    const x = padLeft + (data.length === 1 ? chartW / 2 : (idx / (data.length - 1)) * chartW);
    const y = padTop + chartH - (d.views / maxVal) * chartH;
    return { ...d, x, y };
  });

  const linePath = coords.map((p, idx) => `${idx === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ');
  const areaPath = `${linePath} L ${coords[coords.length - 1].x.toFixed(1)} ${(padTop + chartH).toFixed(1)} L ${coords[0].x.toFixed(1)} ${(padTop + chartH).toFixed(1)} Z`;

  const yTicks = [0, Math.round(maxVal / 2), maxVal];

  return (
    <div className="w-full relative">
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-56 overflow-visible" role="img" aria-label="Views over the last 7 days">
        <defs>
          <linearGradient id="tap9jaViewsGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#10b981" stopOpacity="0.28" />
            <stop offset="100%" stopColor="#7c3aed" stopOpacity="0.02" />
          </linearGradient>
          <linearGradient id="tap9jaLineStroke" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#059669" />
            <stop offset="100%" stopColor="#7c3aed" />
          </linearGradient>
        </defs>

        {yTicks.map((tick) => {
          const y = padTop + chartH - (tick / maxVal) * chartH;
          return (
            <g key={tick}>
              <line x1={padLeft} x2={width - padRight} y1={y} y2={y} stroke="#e2e8f0" strokeDasharray="3 3" />
              <text x={padLeft - 8} y={y + 4} textAnchor="end" className="fill-slate-400 text-[11px] font-mono-nums">
                {tick}
              </text>
            </g>
          );
        })}

        <path d={areaPath} fill="url(#tap9jaViewsGrad)" />
        <path d={linePath} fill="none" stroke="url(#tap9jaLineStroke)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />

        {coords.map((pt, idx) => (
          <g
            key={pt.date}
            onMouseEnter={() => setHoveredIdx(idx)}
            onMouseLeave={() => setHoveredIdx(null)}
            className="cursor-pointer"
          >
            <circle
              cx={pt.x}
              cy={pt.y}
              r={hoveredIdx === idx ? 6 : 4}
              className="fill-white stroke-emerald-600 transition-all"
              strokeWidth={2.5}
            />
            <text
              x={pt.x}
              y={height - 10}
              textAnchor="middle"
              className="fill-slate-500 text-[11px]"
            >
              {pt.label.split(',')[0]}
            </text>
            {hoveredIdx === idx && (
              <g transform={`translate(${Math.min(Math.max(pt.x - 44, 8), width - 96)}, ${Math.max(pt.y - 38, 2)})`}>
                <rect width="88" height="28" rx="8" className="fill-slate-900" />
                <text x="44" y="18" textAnchor="middle" className="fill-white text-[11px] font-mono-nums font-semibold">
                  {pt.views} views
                </text>
              </g>
            )}
          </g>
        ))}
      </svg>
    </div>
  );
}

export function ClicksBarChart({ data }: { data: ClicksBarItem[] }) {
  if (!data || data.length === 0) {
    return (
      <div className="h-56 flex items-center justify-center text-sm text-slate-400">
        Add links to start tracking clicks per link.
      </div>
    );
  }

  const top = data.slice(0, 6);
  const maxClicks = Math.max(1, ...top.map((d) => d.clicks));

  return (
    <div className="space-y-3.5">
      {top.map((item) => {
        const pct = Math.max(4, Math.round((item.clicks / maxClicks) * 100));
        return (
          <div key={item.id} className="space-y-1.5">
            <div className="flex items-center justify-between gap-4 text-xs">
              <span className="font-medium text-slate-800 truncate">{item.title}</span>
              <span className="font-mono-nums font-semibold text-slate-700 shrink-0">
                {item.clicks.toLocaleString('en-NG')} clicks
              </span>
            </div>
            <div className="h-2.5 w-full rounded-full bg-slate-100 overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-purple-600 transition-all duration-300"
                style={{ width: `${item.clicks === 0 ? 0 : pct}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
