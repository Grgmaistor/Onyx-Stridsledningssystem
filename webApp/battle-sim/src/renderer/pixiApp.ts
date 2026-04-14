import * as PIXI from "pixi.js";
import { useGameStore } from "../state/useGameStore";

export function createPixiApp(container: HTMLDivElement) {
    const app = new PIXI.Application();

    app.init({
        resizeTo: container,
        backgroundColor: 0x1e1e1e,
    }).then(() => {
        container.appendChild(app.canvas); // use .canvas (new API)

        const graphics = new PIXI.Graphics();
        app.stage.addChild(graphics);

        app.ticker.add(() => {
            const { units } = useGameStore.getState();

            graphics.clear();

            units.forEach((unit) => {
                graphics.beginFill(0xff0000);
                graphics.drawCircle(unit.x, unit.y, 5);
                graphics.endFill();
            });
        });
    });
    return app;
}