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
    owner_username?: string;
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

// Fleet Mission Types

export interface FleetMission {
    id: number;
    source_planet_id: number;
    target_planet_id: number;
    source_planet_name?: string;
    target_planet_name?: string;
    mission_type: 'attack' | 'transport';
    ship_count: number;
    gold_carried: number;
    departure_time: string;
    arrival_time: string;
    return_time: string | null;
    status: string;
    owner_id: number;
}

export interface IncomingFleet {
    id: number;
    source_planet_name: string;
    source_owner_username: string;
    ship_count: number;
    mission_type: string;
    arrival_time: string;
}

export interface FleetMissionsState {
    outgoing: FleetMission[];
    incoming: IncomingFleet[];
}

// Message Types

export interface Message {
    id: number;
    subject: string;
    body: string;
    is_read: boolean;
    created_at: string;
}

export interface MessageListState {
    messages: Message[];
    unread_count: number;
}
