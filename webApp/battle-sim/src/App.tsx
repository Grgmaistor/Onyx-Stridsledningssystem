import { useEffect, useRef } from "react";
import { createPixiApp } from "./renderer/pixiapp";
import { startGameLoop } from "./simulation/gameloop";
import { useGameStore } from "./state/useGameStore";

function App() {
  const containerRef = useRef<HTMLDivElement>(null);
  const addUnit = useGameStore((s) => s.addUnit);

  useEffect(() => {
    if (containerRef == null || !containerRef.current) return;

    createPixiApp(containerRef.current);
    startGameLoop();
  }, []);

  return (
    <div style={{ width: "100vw", height: "100vh" }}>
      <div
        ref={containerRef}
        onClick={(e) => {
          addUnit(e.clientX, e.clientY);
        }}
        style={{ width: "100%", height: "100%" }}
      />

      <div style={{ position: "absolute", top: 10, left: 10 }}>
        <button onClick={() => addUnit(200, 200)}>Add Unit</button>
      </div>
    </div>
  );
}

export default App;