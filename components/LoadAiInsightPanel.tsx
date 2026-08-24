import React, { useEffect, useState } from 'react';
import { AlertCircle, Loader2, RefreshCw, Sparkles, Wifi } from 'lucide-react';
import { OpenRouterService, AiSource } from '../services/openrouter';
import { computeSuggestedDimensions } from '../services/loadInsight';
import { LoadResult, Truck } from '../types';

type Theme = 'light' | 'dark';

interface LoadAiInsightPanelProps {
  mode: 'truck' | 'air' | 'sea';
  vehicle: Truck;
  loadResult: LoadResult;
  theme?: Theme;
  showStability?: boolean;
  compact?: boolean;
  className?: string;
  focusCoG?: boolean;
  onToggleFocusCoG?: () => void;
}

const SourceBadge: React.FC<{ source: AiSource | null; model?: string; theme: Theme; error?: string }> = ({
  source,
  model,
  theme,
  error,
}) => {
  if (!source) return null;
  const isApi = source === 'openrouter';
  return (
    <span
      className={`inline-flex items-center gap-1 text-[8px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded ${
        isApi
          ? 'bg-emerald-500/20 text-emerald-500 border border-emerald-500/30'
          : theme === 'dark'
            ? 'bg-slate-700 text-slate-400 border border-slate-600'
            : 'bg-slate-200 text-slate-500 border border-slate-300'
      }`}
    >
      {isApi && <Wifi className="w-2.5 h-2.5" />}
      {isApi ? `OpenRouter · ${model?.split('/').pop() || 'nemotron'}` : error ? `Local · ${error.slice(0, 40)}` : 'Local rules'}
    </span>
  );
};

export const LoadAiInsightPanel: React.FC<LoadAiInsightPanelProps> = ({
  mode,
  vehicle,
  loadResult,
  theme = 'light',
  showStability = true,
  compact = false,
  className = '',
  focusCoG = false,
  onToggleFocusCoG,
}) => {
  const [stabilityReport, setStabilityReport] = useState('');
  const [loadInsight, setLoadInsight] = useState('');
  const [stabilityLoading, setStabilityLoading] = useState(false);
  const [insightLoading, setInsightLoading] = useState(false);
  const [stabilitySource, setStabilitySource] = useState<AiSource | null>(null);
  const [insightSource, setInsightSource] = useState<AiSource | null>(null);
  const [stabilityModel, setStabilityModel] = useState<string | undefined>();
  const [insightModel, setInsightModel] = useState<string | undefined>();
  const [stabilityError, setStabilityError] = useState<string | undefined>();
  const [insightError, setInsightError] = useState<string | undefined>();

  const cog = loadResult.centerOfGravity;
  const lateralOffset = cog ? Math.abs(cog.z - vehicle.dimensions.width / 2) : 0;
  const safetyOptimal = lateralOffset < 20;
  const safetyCaution = lateralOffset < 40;

  useEffect(() => {
    setStabilityReport('');
    setLoadInsight('');
    setStabilitySource(null);
    setInsightSource(null);
    setStabilityLoading(showStability && !!cog);
    setInsightLoading(true);

    const suggested = computeSuggestedDimensions(vehicle, loadResult.unplacedItems);
    const unplacedNames = loadResult.unplacedItems.map((i) => i.name);

    if (showStability && cog) {
      OpenRouterService.generateStabilityReport({
        lateralOffsetCm: lateralOffset,
        truckWidthCm: vehicle.dimensions.width,
        cogHeightCm: cog.y,
        truckHeightCm: vehicle.dimensions.height,
        volumeUtilization: loadResult.volumeUtilization,
        weightUtilization: loadResult.weightUtilization || 0,
        placedItems: loadResult.placedItems.length,
        unplacedItems: loadResult.unplacedItems.length,
        mode,
      })
        .then((res) => {
          setStabilityReport(res.text);
          setStabilitySource(res.source);
          setStabilityModel(res.model);
          setStabilityError(res.error);
          setStabilityLoading(false);
        })
        .catch(() => setStabilityLoading(false));
    } else {
      setStabilityLoading(false);
    }

    OpenRouterService.generateLoadInsight({
      mode,
      vehicleName: vehicle.name,
      vehicleLengthCm: vehicle.dimensions.length,
      vehicleWidthCm: vehicle.dimensions.width,
      vehicleHeightCm: vehicle.dimensions.height,
      maxWeightKg: vehicle.maxWeight,
      volumeUtilization: loadResult.volumeUtilization,
      weightUtilization: loadResult.weightUtilization || 0,
      placedItems: loadResult.placedItems.length,
      unplacedItems: loadResult.unplacedItems.length,
      unplacedNames,
      suggestedLengthCm: suggested?.length,
      suggestedWidthCm: suggested?.width,
      suggestedHeightCm: suggested?.height,
    })
      .then((res) => {
        setLoadInsight(res.text);
        setInsightSource(res.source);
        setInsightModel(res.model);
        setInsightError(res.error);
        setInsightLoading(false);
      })
      .catch(() => setInsightLoading(false));
  }, [loadResult, vehicle, mode, showStability, cog, lateralOffset]);

  const isDark = theme === 'dark';
  const card = isDark
    ? 'bg-slate-950/90 border-slate-700 text-slate-100'
    : 'bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 text-slate-800 dark:text-white';
  const sub = isDark ? 'text-slate-400' : 'text-slate-500 dark:text-slate-400';
  const aiBox = isDark
    ? 'bg-indigo-950/40 border-indigo-800/50'
    : 'bg-indigo-50 dark:bg-indigo-950/30 border-indigo-200 dark:border-indigo-800';
  const aiLabel = isDark ? 'text-indigo-400' : 'text-indigo-600 dark:text-indigo-400';
  const barBg = isDark ? 'bg-slate-800' : 'bg-slate-200 dark:bg-slate-700';

  return (
    <div className={`rounded-xl border ${compact ? 'p-3' : 'p-4'} ${card} ${className}`}>
      {showStability && (
        <div className={compact ? 'mb-3' : 'mb-4'}>
          <div className="flex items-center justify-between gap-2 mb-3">
            <h4 className={`font-bold flex items-center gap-2 ${compact ? 'text-xs' : 'text-sm'}`}>
              <AlertCircle className="w-4 h-4 text-blue-500" />
              AI Stability Analysis
            </h4>
            {!stabilityLoading && stabilitySource && (
              <SourceBadge source={stabilitySource} model={stabilityModel} theme={theme} error={stabilityError} />
            )}
          </div>

          {cog ? (
            <div className="space-y-2">
              <div>
                <div className={`flex justify-between text-[10px] uppercase tracking-wider ${sub} mb-1`}>
                  <span>Lateral Balance</span>
                  <span className={safetyOptimal ? 'text-green-500' : safetyCaution ? 'text-yellow-500' : 'text-red-500'}>
                    {lateralOffset.toFixed(1)}cm offset
                  </span>
                </div>
                <div className={`h-1.5 ${barBg} rounded-full relative overflow-hidden`}>
                  <div
                    className="absolute h-full bg-blue-500 transition-all duration-500"
                    style={{
                      left: '50%',
                      width: `${Math.min(50, (lateralOffset / (vehicle.dimensions.width / 2)) * 100)}%`,
                      transform: cog.z - vehicle.dimensions.width / 2 < 0 ? 'translateX(-100%)' : 'translateX(0)',
                    }}
                  />
                  <div className="absolute left-1/2 top-0 bottom-0 w-px bg-white/40 z-10" />
                </div>
              </div>

              <div>
                <div className={`flex justify-between text-[10px] uppercase tracking-wider ${sub} mb-1`}>
                  <span>Vertical CoG</span>
                  <span className="text-green-500">
                    {((cog.y / vehicle.dimensions.height) * 100).toFixed(0)}% height
                  </span>
                </div>
                <div className={`h-1.5 ${barBg} rounded-full overflow-hidden`}>
                  <div
                    className="h-full bg-green-500 transition-all duration-500"
                    style={{ width: `${Math.max(10, 100 - (cog.y / vehicle.dimensions.height) * 100)}%` }}
                  />
                </div>
              </div>

              <div className="flex items-center justify-between pt-1">
                <span className={`text-xs ${sub}`}>Safety Rating</span>
                <span
                  className={`px-2 py-0.5 text-[10px] font-bold rounded uppercase ${
                    safetyOptimal
                      ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                      : safetyCaution
                        ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400'
                        : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'
                  }`}
                >
                  {safetyOptimal ? 'Optimal' : safetyCaution ? 'Caution' : 'Rebalance'}
                </span>
              </div>

              <div className={`mt-2 p-3 rounded-lg border ${aiBox}`}>
                <div className="flex items-center gap-1.5 mb-1.5">
                  <div className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse" />
                  <span className={`text-[9px] font-bold uppercase tracking-wider ${aiLabel}`}>AI Summary</span>
                </div>
                {stabilityLoading ? (
                  <div className="flex items-center gap-2 text-xs text-indigo-500">
                    <Loader2 className="w-3 h-3 animate-spin" />
                    Calling OpenRouter API...
                  </div>
                ) : (
                  <p className="text-[10px] leading-relaxed text-slate-600 dark:text-slate-300">
                    {stabilityReport || 'Run optimization to generate AI analysis.'}
                  </p>
                )}
              </div>

              {onToggleFocusCoG && (
                <button
                  type="button"
                  onClick={onToggleFocusCoG}
                  className={`w-full mt-3 py-2 rounded-lg text-[10px] font-bold uppercase transition flex items-center justify-center gap-2 ${
                    focusCoG
                      ? 'bg-rose-600 text-white shadow-lg shadow-rose-500/30'
                      : isDark
                        ? 'bg-slate-800 text-slate-200 hover:bg-slate-700'
                        : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-300 dark:hover:bg-slate-600'
                  }`}
                >
                  <RefreshCw className={`w-3 h-3 ${focusCoG ? 'animate-spin' : ''}`} />
                  {focusCoG ? 'Exit Analysis Mode' : 'Analyze Center of Gravity'}
                </button>
              )}
            </div>
          ) : (
            <p className={`text-[10px] ${sub}`}>Calculate load to analyze center of gravity.</p>
          )}
        </div>
      )}

      <div className={showStability ? 'border-t border-slate-700/30 pt-3' : ''}>
        <div className="flex items-center justify-between gap-2 mb-2">
          <h4 className={`font-bold flex items-center gap-2 ${compact ? 'text-xs' : 'text-sm'}`}>
            <Sparkles className="w-4 h-4 text-violet-500" />
            AI Load Insight
          </h4>
          {!insightLoading && insightSource && (
            <SourceBadge source={insightSource} model={insightModel} theme={theme} error={insightError} />
          )}
        </div>
        <div className={`p-3 rounded-lg border ${aiBox}`}>
          {insightLoading ? (
            <div className="flex items-center gap-2 text-xs text-violet-500">
              <Loader2 className="w-3 h-3 animate-spin" />
              Calling OpenRouter API...
            </div>
          ) : (
            <p className="text-[10px] leading-relaxed text-slate-600 dark:text-slate-300">
              {loadInsight || 'Optimize load to see stacking and capacity recommendations.'}
            </p>
          )}
        </div>
      </div>
    </div>
  );
};
