import React from 'react';
import useClock from '../hooks/useClock';

const Clock: React.FC = () => {
  const now = useClock();

  const timeString = now.toLocaleTimeString('en-US', {
    hour12: false,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
  
  const dateString = now.toLocaleDateString('id-ID', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return (
    <div className="text-center">
      <h1 className="text-8xl md:text-9xl font-extrabold tracking-tighter tabular-nums text-gray-800" style={{textShadow: '0 4px 12px rgba(0,0,0,0.1)'}}>
        {timeString}
      </h1>
      <p className="text-2xl md:text-3xl mt-2 text-gray-600">{dateString}</p>
    </div>
  );
};

export default Clock;