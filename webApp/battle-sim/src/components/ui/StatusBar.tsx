export function StatusBar({ mousePos }: { mousePos: { lng: number, lat: number } | null }) {
  return (
    <div className="absolute bottom-20 left-80 ml-4 flex items-center space-x-3 pointer-events-none z-10">
      <div className="px-3 py-1.5 bg-gray-900/80 backdrop-blur border border-gray-700 rounded-md text-xs font-mono text-gray-300 shadow">
        {mousePos ? (
          <>
            <span className="text-gray-500 mr-1">LAT</span> {mousePos.lat.toFixed(4)}°
            <span className="text-gray-500 mx-2">|</span>
            <span className="text-gray-500 mr-1">LNG</span> {mousePos.lng.toFixed(4)}°
          </>
        ) : (
          <span className="text-gray-500">Cursor position unknown</span>
        )}
      </div>
    </div>
  );
}
