import React from 'react';

interface TimeframeSelectorProps {
  value: string;
  onChange: (timeframe: string) => void;
}

const timeframes = [
  { label: '1m', value: '1m' },
  { label: '5m', value: '5m' },
  { label: '15m', value: '15m' },
  { label: '1h', value: '1h' },
  { label: '4h', value: '4h' },
  { label: '1d', value: '1d' },
];

export const TimeframeSelector: React.FC<TimeframeSelectorProps> = ({
  value,
  onChange,
}) => {
  return (
    <div className="flex gap-1 p-1 bg-gray-800 rounded-lg">
      {timeframes.map((timeframe) => (
        <button
          key={timeframe.value}
          onClick={() => onChange(timeframe.value)}
          className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
            value === timeframe.value
              ? 'bg-blue-600 text-white'
              : 'text-gray-400 hover:text-white hover:bg-gray-700'
          }`}
        >
          {timeframe.label}
        </button>
      ))}
    </div>
  );
};
