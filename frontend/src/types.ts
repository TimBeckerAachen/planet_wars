export interface User {
    id: number;
    username: string;
    email: string;
    gold: number;
    created_at: string;
    updated_at: string;
}

export interface Planet {
    id: number;
    x: number;
    y: number;
    name: string;
    owner_id: number;
}

export interface Building {
    id: number;
    name: string;
    level: number;
    is_constructing: boolean;
    finish_time: string | null;
}

export interface Unit {
    id: number;
    name: string;
    count: number;
}

export interface ConstructionOption {
    name: string;
    type: 'build' | 'upgrade';
    cost: number;
    duration: number; // seconds
    production: number;
    level: number;
}

export interface GameState {
    user: User;
    planet: Planet;
    buildings: Building[];
    units: Unit[];
    construction_options: ConstructionOption[];
}

export interface MapState {
    planets: Planet[];
}
