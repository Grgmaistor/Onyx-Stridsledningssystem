import { create } from "zustand";

type Unit = {
    id: number;
    x: number;
    y: number;
    hp: number;
};

type GameState = {
    units: Unit[];
    addUnit: (x: number, y: number) => void;
};

let id = 0;

export const useGameStore = create<GameState>((set) => ({
    units: [],
    addUnit: (x, y) =>
        set((state) => ({
            units: [...state.units, { id: id++, x, y, hp: 100 }],
        })),
}));