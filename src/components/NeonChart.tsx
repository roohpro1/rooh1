import React, { useState, useEffect } from 'react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Cell, CartesianGrid } from 'recharts';
import { BarChart3, AlignRight, Activity, Tag, Sparkles } from 'lucide-react';

interface NeonChartProps {
  data?: {
    title?: string;
    labels?: string[];
    scores?: number[];
  };
}

const NEON_COLORS = [
  { 
    stroke: '#06b6d4', 
    fill: 'url(#cyanGlow)', 
    text: 'text-cyan-600 dark:text-cyan-400', 
    border: 'border-cyan-500', 
    bg: 'bg-cyan-50 dark:bg-cyan-500/15', 
    dot: 'bg-cyan-500',
    tooltipBg: 'bg-cyan-50 dark:bg-slate-900 border-cyan-400'
  },
  { 
    stroke: '#d946ef', 
    fill: 'url(#pinkGlow)', 
    text: 'text-pink-600 dark:text-pink-400', 
    border: 'border-pink-500', 
    bg: 'bg-pink-50 dark:bg-pink-500/15', 
    dot: 'bg-pink-500',
    tooltipBg: 'bg-pink-50 dark:bg-slate-900 border-pink-400'
  },
  { 
    stroke: '#10b981', 
    fill: 'url(#emeraldGlow)', 
    text: 'text-emerald-600 dark:text-emerald-400', 
    border: 'border-emerald-500', 
    bg: 'bg-emerald-50 dark:bg-emerald-500/15', 
    dot: 'bg-emerald-500',
    tooltipBg: 'bg-emerald-50 dark:bg-slate-900 border-emerald-400'
  },
  { 
    stroke: '#f59e0b', 
    fill: 'url(#amberGlow)', 
    text: 'text-amber-600 dark:text-amber-400', 
    border: 'border-amber-500', 
    bg: 'bg-amber-50 dark:bg-amber-500/15', 
    dot: 'bg-amber-500',
    tooltipBg: 'bg-amber-50 dark:bg-slate-900 border-amber-400'
  },
  { 
    stroke: '#8b5cf6', 
    fill: 'url(#purpleGlow)', 
    text: 'text-purple-600 dark:text-purple-400', 
    border: 'border-purple-500', 
    bg: 'bg-purple-50 dark:bg-purple-500/15', 
    dot: 'bg-purple-500',
    tooltipBg: 'bg-purple-50 dark:bg-slate-900 border-purple-400'
  },
  { 
    stroke: '#ef4444', 
    fill: 'url(#redGlow)', 
    text: 'text-red-600 dark:text-red-400', 
    border: 'border-red-500', 
    bg: 'bg-red-50 dark:bg-red-500/15', 
    dot: 'bg-red-500',
    tooltipBg: 'bg-red-50 dark:bg-slate-900 border-red-400'
  },
];

export const NeonChart: React.FC<NeonChartProps> = ({ data }) => {
  const [viewMode, setViewMode] = useState<'vertical' | 'horizontal'>('vertical');
  const [isMobile, setIsMobile] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return window.innerWidth < 640;
    }
    return false;
  });

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 640);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const defaultLabels = [
    "سرعة الاستجابة والأداء", 
    "مستوى الأمان والخصوصية", 
    "سلاسة الواجهة والاستخدام", 
    "كفاءة استهلاك البطارية", 
    "تنوع الوظائف والمميزات",
    "جودة التحديثات والدعم"
  ];
  const defaultScores = [94, 88, 96, 84, 92, 90];

  const labels = (data && data.labels && data.labels.length > 0) ? data.labels : defaultLabels;
  const scores = (data && data.scores && data.scores.length > 0) ? data.scores : defaultScores;

  // Short labels for mobile display to prevent overlap
  const getShortName = (name: string, index: number) => {
    if (!isMobile) {
      return name.length > 18 ? name.slice(0, 18) + '...' : name;
    }
    const shortMap: Record<number, string> = {
      0: "الأداء والسرعة",
      1: "الأمان والخصوصية",
      2: "سهولة الواجهة",
      3: "توفير البطارية",
      4: "الميزات الذكية",
      5: "الدعم والتحديث"
    };
    if (shortMap[index]) return shortMap[index];
    const words = name.split(' ');
    return words.slice(0, 2).join(' ');
  };

  const chartData = labels.map((label, index) => ({
    name: label,
    shortName: getShortName(label, index),
    score: scores[index] !== undefined ? scores[index] : 88,
    color: NEON_COLORS[index % NEON_COLORS.length]
  }));

  return (
    <div 
      className="w-full max-w-full bg-white dark:bg-slate-950/95 border-2 border-amber-300 dark:border-amber-500/40 rounded-3xl p-3.5 sm:p-6 backdrop-blur-md relative overflow-hidden my-6 shadow-md transition-all duration-300" 
      style={{ direction: 'rtl' }}
    >
      {/* Top Cyberpunk Neon Bar */}
      <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-red-500 via-cyan-500 via-pink-500 to-amber-400"></div>
      
      {/* Header with Title & Mode Switcher */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-5 pb-4 border-b border-slate-200 dark:border-slate-800/80">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-red-500/10 border border-red-500/30 rounded-2xl text-red-500 dark:text-red-400 shadow-xs">
            <Activity className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <h3 className="text-black dark:text-white text-base sm:text-lg font-black tracking-wide flex items-center gap-2">
              <span>{data?.title || "التحليل البياني لوظائف ومميزات التطبيق"}</span>
              <Sparkles className="w-4 h-4 text-red-500 dark:text-red-400 shrink-0" />
            </h3>
            <p className="text-xs text-black dark:text-slate-300 font-bold mt-0.5">
              مخطط بياني مستطيل بعرض كامل لقياس وتقييم كفاءة كل وظيفة داخل التطبيق
            </p>
          </div>
        </div>

        {/* Layout Mode Switcher */}
        <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-900 p-1 rounded-xl border border-slate-300 dark:border-slate-800">
          <button
            onClick={() => setViewMode('vertical')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-black transition-all cursor-pointer ${
              viewMode === 'vertical'
                ? 'bg-red-500 text-white font-black shadow-sm'
                : 'text-black dark:text-slate-400 hover:text-red-600 dark:hover:text-white'
            }`}
          >
            <BarChart3 className="w-3.5 h-3.5" />
            <span>خطوط متجاورة</span>
          </button>

          <button
            onClick={() => setViewMode('horizontal')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-black transition-all cursor-pointer ${
              viewMode === 'horizontal'
                ? 'bg-red-500 text-white font-black shadow-sm'
                : 'text-black dark:text-slate-400 hover:text-red-600 dark:hover:text-white'
            }`}
          >
            <AlignRight className="w-3.5 h-3.5" />
            <span>خطوط تفصيلية</span>
          </button>
        </div>
      </div>

      {/* Classification Badges (مفتاح الرسم البياني - إطارات ملونة مستقلة مع منع تداخل النصوص في الهاتف) */}
      <div className="mb-5">
        <div className="flex items-center justify-between gap-2 mb-2.5">
          <div className="flex items-center gap-2">
            <Tag className="w-4 h-4 text-black dark:text-slate-400 shrink-0" />
            <h4 className="text-xs sm:text-sm font-black text-black dark:text-slate-200">
              تصنيف ألوان الوظائف والمميزات (دليل القراءة البياني):
            </h4>
          </div>
          <span className="text-[10px] font-black text-black dark:text-slate-300 bg-amber-200 dark:bg-slate-800 px-2.5 py-0.5 rounded-full border border-amber-400 dark:border-slate-700 shrink-0">
            مفتاح الرسم البياني
          </span>
        </div>

        {/* Badges Grid: 2 columns on mobile, 3 on small tablets, 6 on desktop to prevent any text overlapping */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2 sm:gap-2.5">
          {chartData.map((item, idx) => (
            <div 
              key={idx} 
              className={`flex items-center justify-between px-2.5 py-2 rounded-xl ${item.color.bg} border-2 ${item.color.border} transition-transform hover:scale-[1.02] min-w-0 shadow-xs`}
              title={`${item.name}: ${item.score}%`}
            >
              <div className="flex items-center gap-1.5 min-w-0 overflow-hidden">
                <span className={`w-2.5 h-2.5 rounded-full ${item.color.dot} shrink-0 shadow-[0_0_6px_currentColor]`}></span>
                <span className="text-[11px] sm:text-xs font-black text-black dark:text-slate-100 truncate">{item.name}</span>
              </div>
              <span className="text-[11px] sm:text-xs font-black text-black dark:text-white font-mono shrink-0 mr-1">
                {item.score}%
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* SVG Definitions for Glowing Gradients */}
      <svg className="h-0 w-0 absolute">
        <defs>
          <linearGradient id="cyanGlow" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#06b6d4" stopOpacity={1} />
            <stop offset="100%" stopColor="#0891b2" stopOpacity={0.4} />
          </linearGradient>
          <linearGradient id="pinkGlow" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#d946ef" stopOpacity={1} />
            <stop offset="100%" stopColor="#c026d3" stopOpacity={0.4} />
          </linearGradient>
          <linearGradient id="emeraldGlow" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#10b981" stopOpacity={1} />
            <stop offset="100%" stopColor="#059669" stopOpacity={0.4} />
          </linearGradient>
          <linearGradient id="amberGlow" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#f59e0b" stopOpacity={1} />
            <stop offset="100%" stopColor="#d97706" stopOpacity={0.4} />
          </linearGradient>
          <linearGradient id="purpleGlow" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#8b5cf6" stopOpacity={1} />
            <stop offset="100%" stopColor="#7c3aed" stopOpacity={0.4} />
          </linearGradient>
          <linearGradient id="blueGlow" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#3b82f6" stopOpacity={1} />
            <stop offset="100%" stopColor="#2563eb" stopOpacity={0.4} />
          </linearGradient>
          <linearGradient id="redGlow" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#ef4444" stopOpacity={1} />
            <stop offset="100%" stopColor="#b91c1c" stopOpacity={0.4} />
          </linearGradient>

          <filter id="neonGlowEffect" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
      </svg>

      {/* Main Bar Chart Container */}
      {viewMode === 'vertical' ? (
        <div className="w-full h-[320px] sm:h-[350px] [&_.recharts-surface]:outline-none [&_.recharts-layer]:outline-none [&_path]:outline-none [&_rect]:outline-none select-none">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart 
              data={chartData} 
              margin={{ top: 20, right: 10, left: 10, bottom: isMobile ? 55 : 45 }}
              barCategoryGap={isMobile ? "12%" : "18%"}
              barGap={6}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#cbd5e1" className="dark:stroke-slate-800" vertical={false} />
              
              <XAxis 
                dataKey={isMobile ? "shortName" : "name"} 
                tick={{ fontSize: isMobile ? 10 : 11, fontWeight: 900, fill: '#000000' }}
                stroke="#000000"
                dy={isMobile ? 15 : 12}
                angle={isMobile ? -25 : 0}
                textAnchor={isMobile ? "end" : "middle"}
                tickLine={false}
                axisLine={{ stroke: '#000000', strokeWidth: 1.5 }}
                interval={0}
              />
              
              <YAxis 
                domain={[0, 100]} 
                tick={{ fontSize: 11, fontWeight: 900, fill: '#000000' }}
                stroke="#000000"
                axisLine={{ stroke: '#000000', strokeWidth: 1.5 }}
                unit="%"
              />

              {/* Distinctive Colored Popup Tooltip Window on Hover / Touch with Bold Black Text */}
              <Tooltip 
                cursor={false}
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const item = payload[0].payload;
                    return (
                      <div className={`p-3 rounded-2xl shadow-xl text-right backdrop-blur-md border-2 ${item.color.tooltipBg}`}>
                        <div className="flex items-center gap-2 mb-1.5">
                          <span className={`w-3 h-3 rounded-full ${item.color.dot} shadow-[0_0_8px_currentColor]`}></span>
                          <p className="text-xs sm:text-sm text-black dark:text-white font-black">{item.name}</p>
                        </div>
                        <p className="text-sm sm:text-base font-black text-black dark:text-white font-mono bg-white/80 dark:bg-black/40 px-2 py-0.5 rounded-lg border border-black/10">
                          درجة التقييم: {item.score}%
                        </p>
                      </div>
                    );
                  }
                  return null;
                }}
              />

              <Bar 
                dataKey="score" 
                radius={[8, 8, 0, 0]} 
                maxBarSize={isMobile ? 24 : 32}
                filter="url(#neonGlowEffect)"
                activeBar={(props: any) => {
                  const { x, y, width, height, payload } = props;
                  const strokeColor = payload?.color?.stroke || "#ef4444";
                  return (
                    <g className="cursor-pointer transition-all duration-300">
                      {/* Neon Glow backdrop column strictly for the active bar only */}
                      <rect
                        x={x - 2}
                        y={Math.max(10, y - 4)}
                        width={width + 4}
                        height={height + 4}
                        rx={8}
                        ry={8}
                        fill={strokeColor}
                        fillOpacity={0.25}
                        filter="url(#neonGlowEffect)"
                      />
                      {/* Vibrant Neon Active Bar */}
                      <rect
                        x={x}
                        y={y}
                        width={width}
                        height={height}
                        rx={8}
                        ry={8}
                        fill={strokeColor}
                        stroke="#000000"
                        strokeWidth={2}
                      />
                    </g>
                  );
                }}
              >
                {chartData.map((entry, index) => (
                  <Cell 
                    key={`cell-${index}`} 
                    fill={entry.color.fill} 
                    stroke={entry.color.stroke}
                    strokeWidth={1.5}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <div className="space-y-4 py-2">
          {chartData.map((item, index) => (
            <div key={index} className="space-y-1.5">
              <div className="flex justify-between items-center text-xs sm:text-sm font-black">
                <span className="text-black dark:text-slate-100 flex items-center gap-2 font-black">
                  <span className={`w-2.5 h-2.5 rounded-full ${item.color.bg} ${item.color.border} border shadow-[0_0_6px_currentColor]`}></span>
                  {item.name}
                </span>
                <span className="text-black dark:text-white font-black font-mono">{item.score}%</span>
              </div>

              {/* Individual colored border around this specific progress bar */}
              <div className={`w-full bg-slate-100 dark:bg-slate-900/90 rounded-full h-3.5 border-2 ${item.color.border} p-0.5 overflow-hidden relative shadow-xs`}>
                <div 
                  className="h-full rounded-full transition-all duration-1000 shadow-[0_0_12px_currentColor]"
                  style={{ 
                    width: `${item.score}%`,
                    background: item.color.stroke,
                    boxShadow: `0 0 10px ${item.color.stroke}`
                  }}
                ></div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

