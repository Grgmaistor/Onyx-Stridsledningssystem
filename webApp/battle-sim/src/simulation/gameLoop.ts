import { useGameStore } from "../state/useGameStore";

let running = false;

export function startGameLoop() {
    if (running) return;
    running = true;

    function loop() {
        const state = useGameStore.getState();

        // Do update here
        state.units.forEach((unit) => {
            unit.x += Math.random() - 0.5;
            unit.y += Math.random() - 0.5;
        });

        requestAnimationFrame(loop);
    }

    requestAnimationFrame(loop);
}