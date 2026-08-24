import React, { useState, useEffect, useRef } from 'react';
import { Search, MapPin, Loader2, Plane, Anchor, Building2 } from 'lucide-react';
import { searchLocations, type LocationCategory, type LocationSuggestion } from '../services/geocoding';

interface LocationAutocompleteProps {
  value: string;
  onChange: (address: string, city: string, lat?: number, lng?: number) => void;
  placeholder?: string;
  className?: string;
  global?: boolean;
  category?: LocationCategory;
}

export const LocationAutocomplete: React.FC<LocationAutocompleteProps> = ({
  value,
  onChange,
  placeholder = 'Search any location worldwide...',
  className = '',
  global = true,
  category = 'any',
}) => {
  const [query, setQuery] = useState(value);
  const [suggestions, setSuggestions] = useState<LocationSuggestion[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setQuery(value);
  }, [value]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setQuery(val);
    setIsOpen(true);

    if (debounceTimer.current) clearTimeout(debounceTimer.current);

    if (val.length < 2) {
      setSuggestions([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    debounceTimer.current = setTimeout(async () => {
      const results = await searchLocations(val, global, category);
      setSuggestions(results);
      setLoading(false);
    }, 350);
  };

  const handleSelect = (s: LocationSuggestion) => {
    const city =
      s.address.city ||
      s.address.town ||
      s.address.village ||
      s.address.state ||
      s.address.country ||
      '';
    const state = s.address.state ? `, ${s.address.state}` : '';
    const country = s.address.country ? `, ${s.address.country}` : '';
    const cityString = `${city}${state}${country}`.replace(/^,\s*/, '');

    const mainLabel = s.display_name.split(',')[0].trim();
    setQuery(mainLabel);
    onChange(mainLabel, cityString || s.display_name, s.lat, s.lng);
    setIsOpen(false);
  };

  const CategoryIcon =
    category === 'airport' ? Plane : category === 'port' ? Anchor : Building2;

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      <div className="relative">
        <input
          type="text"
          value={query}
          onChange={handleInputChange}
          onFocus={() => query.length >= 2 && setIsOpen(true)}
          placeholder={placeholder}
          className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-brand-500 focus:border-brand-500 transition-all outline-none"
        />
        <div className="absolute left-3 top-2.5 text-gray-400">
          {loading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Search className="w-4 h-4" />
          )}
        </div>
      </div>

      {isOpen && (suggestions.length > 0 || loading) && (
        <div className="absolute z-50 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl max-h-60 overflow-y-auto overflow-x-hidden">
          {loading && suggestions.length === 0 ? (
            <div className="p-4 text-center text-sm text-gray-500 dark:text-gray-400">
              Searching worldwide...
            </div>
          ) : (
            suggestions.map((s, idx) => (
              <button
                key={`${s.lat}-${s.lng}-${idx}`}
                onClick={() => handleSelect(s)}
                className="w-full text-left px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700 border-b border-gray-100 dark:border-gray-700 last:border-0 transition-colors group"
              >
                <div className="flex items-start gap-3">
                  <CategoryIcon className="w-4 h-4 text-gray-400 group-hover:text-brand-500 mt-0.5 flex-shrink-0" />
                  <div className="overflow-hidden min-w-0">
                    <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                      {s.display_name.split(',')[0]}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 truncate mt-0.5">
                      {s.display_name}
                    </p>
                    <p className="text-[10px] text-gray-400 font-mono mt-0.5">
                      {s.lat.toFixed(4)}°, {s.lng.toFixed(4)}°
                    </p>
                  </div>
                </div>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
};
