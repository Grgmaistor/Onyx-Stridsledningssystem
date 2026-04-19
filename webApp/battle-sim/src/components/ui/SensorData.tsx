export function SensorData() {
  return (
    <div className="absolute bottom-20 right-4 bg-[#0a1f0a]/90 backdrop-blur-md border border-green-800/50 p-5 rounded-lg text-white shadow-2xl z-10 pointer-events-auto w-40">
      <h3 className="text-sm font-semibold mb-4 text-green-300">Sensor data</h3>
      <div className="space-y-3">
        <label className="flex items-center space-x-3 cursor-pointer group">
          <input type="checkbox" defaultChecked className="form-checkbox h-4 w-4 text-green-500 rounded bg-green-900/50 border-green-700" />
          <span className="text-sm text-green-100 group-hover:text-white transition-colors">Radar</span>
        </label>
        <label className="flex items-center space-x-3 cursor-pointer group">
          <input type="checkbox" defaultChecked className="form-checkbox h-4 w-4 text-green-500 rounded bg-green-900/50 border-green-700" />
          <span className="text-sm text-green-100 group-hover:text-white transition-colors">Cloud</span>
        </label>
        <label className="flex items-center space-x-3 cursor-pointer group">
          <input type="checkbox" className="form-checkbox h-4 w-4 text-green-500 rounded bg-green-900/50 border-green-700" />
          <span className="text-sm text-gray-400 group-hover:text-white transition-colors">Civil</span>
        </label>
      </div>
    </div>
  );
}
