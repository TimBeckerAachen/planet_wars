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


export interface ProductionOption {
    name: string;
    cost: Record<string, number>;
    duration: number;
    base_time: number;
}

export interface BuildingDetails extends Building {
    upgrade_cost?: number;
    upgrade_duration?: number;
    production_options: ProductionOption[];
    current_production_speed_bonus?: number;
    next_level_production_speed_bonus?: number;
    production_type?: string | null;
    production_finish_time?: string | null;
}

export interface MapState {
    planets: Planet[];
}
