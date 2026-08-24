/**
 * OpenRouter API — chat + AI analysis (NVIDIA Nemotron free tier).
 */
export const OPENROUTER_MODELS = {
  /** Fast Nemotron for landing chatbot */
  chat: 'nvidia/nemotron-3.5-lightning:free',
  /** Deeper Nemotron for stability / load insights */
  analysis: 'nvidia/nemotron-3-super-120b-a12b:free',
  /** If primary model 404s or is rate-limited */
  fallback: 'nvidia/nemotron-3-super-120b-a12b:free',
} as const;

export type AiSource = 'openrouter' | 'local';

export interface AiResult {
  text: string;
  source: AiSource;
  model?: string;
  error?: string;
}

const SYSTEM_DIRECT =
  'You are LogiLoad AI for logistics and cargo planning. Output ONLY the final user-facing answer. ' +
  'Do NOT include thinking steps, reasoning traces, or "Here is a thinking process". Be concise.';

function extractAssistantText(message: Record<string, unknown> | undefined): string | null {
  if (!message) return null;

  const content = typeof message.content === 'string' ? message.content.trim() : '';
  if (content) {
    // Nemotron sometimes dumps chain-of-thought into content — take trailing answer if detected
    if (content.includes("Here's a thinking process") || content.includes('thinking process')) {
      const parts = content.split(/\n\n+/).filter((p) => p.trim().length > 20);
      const last = parts[parts.length - 1];
      if (last && !last.toLowerCase().includes('analyze user')) {
        return last.trim();
      }
    }
    return content;
  }

  const reasoning = typeof message.reasoning === 'string' ? message.reasoning.trim() : '';
  if (reasoning) {
    const lines = reasoning.split('\n').filter((l) => l.trim().length > 15);
    return lines[lines.length - 1]?.trim() || null;
  }

  return null;
}

export const OpenRouterService = {
  getApiKey(): string {
    return (import.meta.env.VITE_OPENROUTER_API_KEY as string)?.trim() || '';
  },

  async chatCompletion(
    messages: { role: 'system' | 'user' | 'assistant'; content: string }[],
    model: string,
    maxTokens = 400,
    temperature = 0.5
  ): Promise<{ result: AiResult | null; error?: string }> {
    const apiKey = this.getApiKey();
    if (!apiKey) {
      return { result: null, error: 'No VITE_OPENROUTER_API_KEY in .env' };
    }

    try {
      const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
          'HTTP-Referer': typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000',
          'X-Title': 'LogiLoad India',
        },
        body: JSON.stringify({
          model,
          messages,
          temperature,
          max_tokens: maxTokens,
        }),
      });

      const raw = await response.text();
      let data: Record<string, unknown> = {};
      try {
        data = JSON.parse(raw);
      } catch {
        return { result: null, error: `Invalid JSON (HTTP ${response.status})` };
      }

      if (!response.ok) {
        const errMsg =
          (data.error as { message?: string })?.message ||
          `HTTP ${response.status}`;
        console.error('OpenRouter error:', model, errMsg);
        return { result: null, error: errMsg };
      }

      const message = (data.choices as Array<{ message?: Record<string, unknown> }>)?.[0]?.message;
      const text = extractAssistantText(message);
      if (!text) {
        return { result: null, error: 'Empty response from model' };
      }

      return {
        result: { text, source: 'openrouter', model },
      };
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Network error';
      console.error('OpenRouter fetch failed:', msg);
      return { result: null, error: msg };
    }
  },

  async completeWithFallback(
    messages: { role: 'system' | 'user' | 'assistant'; content: string }[],
    primaryModel: string,
    maxTokens = 400,
    temperature = 0.5
  ): Promise<{ result: AiResult | null; error?: string }> {
    const models = [primaryModel];
    if (primaryModel !== OPENROUTER_MODELS.fallback) {
      models.push(OPENROUTER_MODELS.fallback);
    }

    let lastError = 'Unknown error';
    for (const model of models) {
      const { result, error } = await this.chatCompletion(messages, model, maxTokens, temperature);
      if (result) return { result };
      lastError = error || lastError;
    }
    return { result: null, error: lastError };
  },

  async generateResponse(
    userPrompt: string,
    chatHistory: { role: 'user' | 'assistant'; content: string }[] = []
  ): Promise<AiResult> {
    const { result, error } = await this.completeWithFallback(
      [
        { role: 'system', content: SYSTEM_DIRECT },
        ...chatHistory.map((m) => ({ role: m.role, content: m.content })),
        { role: 'user', content: userPrompt },
      ],
      OPENROUTER_MODELS.chat,
      350,
      0.6
    );

    if (result) return result;

    return {
      text: '',
      source: 'local',
      error: error || 'OpenRouter unavailable',
    };
  },

  async generateStabilityReport(metrics: {
    lateralOffsetCm: number;
    truckWidthCm: number;
    cogHeightCm: number;
    truckHeightCm: number;
    volumeUtilization: number;
    weightUtilization: number;
    placedItems: number;
    unplacedItems: number;
    mode?: 'truck' | 'air' | 'sea';
  }): Promise<AiResult> {
    const vehicleLabel =
      metrics.mode === 'air' ? 'aircraft cargo hold' :
      metrics.mode === 'sea' ? 'vessel hold' : 'truck';

    const lateralPct = Math.round((metrics.lateralOffsetCm / (metrics.truckWidthCm / 2)) * 100);
    const cogHeightPct = Math.round((metrics.cogHeightCm / metrics.truckHeightCm) * 100);
    const safetyRating =
      lateralPct < 20 && cogHeightPct < 55 ? 'EXCELLENT' :
      lateralPct < 40 ? 'GOOD' : 'NEEDS ATTENTION';

    const prompt = `Cargo ${vehicleLabel} stability report:
- Lateral offset: ${metrics.lateralOffsetCm.toFixed(1)} cm (${lateralPct}% from center)
- CoG height: ${cogHeightPct}% of hold height
- Volume used: ${metrics.volumeUtilization.toFixed(1)}%
- Weight used: ${metrics.weightUtilization.toFixed(1)}%
- Items loaded: ${metrics.placedItems}, not placed: ${metrics.unplacedItems}
- Safety rating: ${safetyRating}

In 2-3 plain sentences, tell the ${metrics.mode === 'air' ? 'pilot' : metrics.mode === 'sea' ? 'captain' : 'driver'} if this load is safe and what to watch for.`;

    const { result, error } = await this.completeWithFallback(
      [
        { role: 'system', content: SYSTEM_DIRECT },
        { role: 'user', content: prompt },
      ],
      OPENROUTER_MODELS.analysis,
      500,
      0.3
    );

    if (result) return result;

    let text: string;
    if (safetyRating === 'EXCELLENT') {
      text = `This load is balanced and safe. Weight is spread evenly and kept low — the ${vehicleLabel} should handle smoothly. ${metrics.unplacedItems > 0 ? `${metrics.unplacedItems} item(s) could not fit.` : 'All items are loaded.'}`;
    } else if (safetyRating === 'GOOD') {
      text = `Generally safe with a small lean (${metrics.lateralOffsetCm.toFixed(1)} cm off-center). Use moderate caution. ${metrics.unplacedItems > 0 ? `${metrics.unplacedItems} item(s) did not fit.` : ''}`;
    } else {
      text = `Noticeable imbalance (${metrics.lateralOffsetCm.toFixed(1)} cm off-center). Redistribute heavy items before departure.`;
    }
    return { text, source: 'local', error: error || 'OpenRouter unavailable' };
  },

  async generateLoadInsight(metrics: {
    mode: 'truck' | 'air' | 'sea';
    vehicleName: string;
    vehicleLengthCm: number;
    vehicleWidthCm: number;
    vehicleHeightCm: number;
    maxWeightKg: number;
    volumeUtilization: number;
    weightUtilization: number;
    placedItems: number;
    unplacedItems: number;
    unplacedNames?: string[];
    suggestedLengthCm?: number;
    suggestedWidthCm?: number;
    suggestedHeightCm?: number;
  }): Promise<AiResult> {
    const modeLabel = metrics.mode === 'air' ? 'aircraft' : metrics.mode === 'sea' ? 'vessel' : 'truck';

    const prompt = `Load plan for ${modeLabel} "${metrics.vehicleName}" (${metrics.vehicleLengthCm / 100}m × ${metrics.vehicleWidthCm / 100}m × ${metrics.vehicleHeightCm / 100}m, max ${metrics.maxWeightKg} kg).
Placed: ${metrics.placedItems}, not placed: ${metrics.unplacedItems}${metrics.unplacedNames?.length ? ` (${metrics.unplacedNames.slice(0, 5).join(', ')})` : ''}.
Volume: ${metrics.volumeUtilization.toFixed(1)}%, weight: ${metrics.weightUtilization.toFixed(1)}%.
${metrics.unplacedItems > 0 ? `Suggested larger hold: ~${(metrics.suggestedLengthCm || metrics.vehicleLengthCm) / 100}m × ${(metrics.suggestedWidthCm || metrics.vehicleWidthCm) / 100}m × ${(metrics.suggestedHeightCm || metrics.vehicleHeightCm) / 100}m.` : ''}

Write 3-4 sentences on stacking quality and whether a bigger ${modeLabel} is needed.`;

    const { result, error } = await this.completeWithFallback(
      [
        { role: 'system', content: SYSTEM_DIRECT },
        { role: 'user', content: prompt },
      ],
      OPENROUTER_MODELS.analysis,
      500,
      0.4
    );

    if (result) return result;

    const stackedWell = metrics.volumeUtilization > 40 && metrics.weightUtilization < 95;
    let text = stackedWell
      ? `Items are stacked efficiently (${metrics.volumeUtilization.toFixed(0)}% space). Weight distribution looks workable.`
      : `Utilization is ${metrics.volumeUtilization.toFixed(0)}% — review stacking and heavy-item placement.`;

    if (metrics.unplacedItems > 0) {
      text += ` ${metrics.unplacedItems} item(s) could not fit in ${metrics.vehicleName}. Consider a larger ${modeLabel} or split shipments.`;
    } else {
      text += ` All cargo fits in the current ${modeLabel}.`;
    }
    return { text, source: 'local', error: error || 'OpenRouter unavailable' };
  },
};
