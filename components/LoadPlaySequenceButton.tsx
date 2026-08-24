import React from 'react';
import { Play, Square } from 'lucide-react';

interface LoadPlaySequenceButtonProps {
  playMode: boolean;
  playIndex: number;
  total: number;
  onToggle: () => void;
  className?: string;
  variant?: 'light' | 'dark';
}

export const LoadPlaySequenceButton: React.FC<LoadPlaySequenceButtonProps> = ({
  playMode,
  playIndex,
  total,
  onToggle,
  className = '',
  variant = 'light',
}) => {
  if (total === 0) return null;

  const base =
    variant === 'dark'
      ? 'bg-slate-900/80 border-slate-700 text-slate-100 hover:bg-slate-800'
      : 'bg-white/90 dark:bg-gray-800/90 text-gray-800 dark:text-white hover:bg-white dark:hover:bg-gray-800';

  return (
    <button
      type="button"
      onClick={onToggle}
      className={`px-3 py-2 rounded text-xs font-semibold transition flex items-center gap-1.5 border ${
        playMode ? 'bg-orange-500 text-white border-orange-400 animate-pulse' : base
      } ${className}`}
      title={
        playMode
          ? 'Stop loading sequence'
          : 'Play loading sequence — items appear in real placement order'
      }
    >
      {playMode ? <Square className="w-4 h-4" /> : <Play className="w-4 h-4" />}
      {playMode ? `Loading ${playIndex + 1}/${total}` : 'Play Sequence'}
    </button>
  );
};
