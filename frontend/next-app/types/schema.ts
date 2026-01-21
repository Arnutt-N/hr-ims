export interface User {
    id: number;
    name: string | null;
    email: string;
    avatar: string | null;
}

export interface Division {
    id: number;
    name: string;
    abbr?: string | null;
}

export interface Province {
    id: number;
    name: string;
    code?: string | null;
}

export interface Warehouse {
    id: number;
    code: string;
    name: string;
    type: string;
    divisionId?: number | null;
    division?: Division | null;
    provinceId?: number | null;
    province?: Province | null;
    isActive: boolean;
    managers: User[];
    _count?: {
        stockLevels: number;
    };
}
