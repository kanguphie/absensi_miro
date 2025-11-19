
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
      {/* Updated color to dark red/maroon based on the screenshot */}
      <h1 className="text-8xl md:text-9xl font-extrabold tracking-tighter tabular-nums text-[#7f1d1d]" style={{textShadow: '0 4px 12px rgba(0,0,0,0.05)'}}>
        {timeString}
      </h1>
      <p className="text-2xl md:text-3xl mt-2 text-slate-600 font-medium">{dateString}</p>
    </div>
  );
};

export default Clock;
