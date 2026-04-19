import { useState } from 'react';

export function TimelineBar() {
  const [sliderVal, setSliderVal] = useState(50); // 0 to 100
  
  return (
    <div className="absolute bottom-0 left-80 right-0 h-16 bg-[#0f172a]/95 backdrop-blur-md border-t border-gray-800 z-10 flex items-center px-12 pointer-events-auto">
      <div className="w-full relative flex items-center h-full">
        {/* Track */}
        <div className="absolute w-full h-4 bg-gray-800/80 rounded-full overflow-hidden border border-gray-700/50">
          {/* Prediction highlight area */}
          <div className="absolute left-[50%] right-[30%] h-full bg-red-500/20"></div>
          {/* Progress fill */}
          <div className="absolute left-0 h-full bg-blue-500/50" style={{ width: `${sliderVal}%` }}></div>
        </div>
        
        {/* Input Range Slider overlay */}
        <input 
          type="range" 
          min="0" max="100" 
          value={sliderVal} 
          onChange={(e) => setSliderVal(Number(e.target.value))}
          className="absolute w-full h-4 opacity-0 cursor-pointer z-30"
        />

        {/* Custom Slider Thumb */}
        <div 
          className="absolute w-5 h-5 bg-white border-4 border-gray-400 rounded-full shadow-lg z-20 pointer-events-none transition-transform"
          style={{ left: `calc(${sliderVal}% - 10px)` }}
        ></div>
        
        {/* Prediction Label */}
        {sliderVal > 50 && (
          <div 
            className="absolute top-[-20px] bg-red-500 text-white text-[10px] px-2 py-0.5 rounded shadow z-20 pointer-events-none transition-all"
            style={{ left: `calc(${sliderVal}% - 25px)` }}
          >
            Prediction
          </div>
        )}

        {/* Time markers */}
        <div className="w-full flex justify-between absolute top-10 text-xs text-gray-400 font-mono pointer-events-none">
          <span>1430</span>
          <span>1430</span> {/* Keeping the duplicate 1430 from mockup or adjusting it */}
          <span>1500</span>
          <span>1530</span>
          <span>1600</span>
          <span>1630</span>
          <span>1730</span>
          <span>1800</span>
        </div>
      </div>
    </div>
  );
}
