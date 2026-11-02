export type ConsumptionPeriod = 'day' | 'week' | 'month'

export interface ConsumptionReading {
    date: string
    label: string
    consumption: number
}

export interface ConsumptionHistory {
    id: string
    date: string
    reading: number
    consumption: number
    status: 'Confirmada' | 'Estimada'
}

export interface ConsumptionSummary {
    total: number
    average: number
    previousPeriod: number
    variation: number
}

// Dados gerais do consumo
export const consumptionSummary: ConsumptionSummary = {
    total: 18.5,
    average: 0.62,
    previousPeriod: 21.2,
    variation: -12.7,
}

// Consumo diário durante outubro
export const dailyConsumption: ConsumptionReading[] = [
    { date: '2026-10-01', label: '01/10', consumption: 0.55 },
    { date: '2026-10-04', label: '04/10', consumption: 0.68 },
    { date: '2026-10-07', label: '07/10', consumption: 0.61 },
    { date: '2026-10-10', label: '10/10', consumption: 0.72 },
    { date: '2026-10-13', label: '13/10', consumption: 0.58 },
    { date: '2026-10-16', label: '16/10', consumption: 0.65 },
    { date: '2026-10-19', label: '19/10', consumption: 0.74 },
    { date: '2026-10-22', label: '22/10', consumption: 0.59 },
    { date: '2026-10-25', label: '25/10', consumption: 0.63 },
    { date: '2026-10-28', label: '28/10', consumption: 0.57 },
    { date: '2026-10-31', label: '31/10', consumption: 0.62 },
]

// Histórico de leituras do hidrômetro
export const consumptionHistory: ConsumptionHistory[] = [
    {
        id: 'LEI-001',
        date: '31/10/2026',
        reading: 1258.5,
        consumption: 18.5,
        status: 'Confirmada',
    },
    {
        id: 'LEI-002',
        date: '30/09/2026',
        reading: 1240.0,
        consumption: 21.2,
        status: 'Confirmada',
    },
    {
        id: 'LEI-003',
        date: '31/08/2026',
        reading: 1218.8,
        consumption: 19.6,
        status: 'Confirmada',
    },
    {
        id: 'LEI-004',
        date: '31/07/2026',
        reading: 1199.2,
        consumption: 20.4,
        status: 'Confirmada',
    },
    {
        id: 'LEI-005',
        date: '30/06/2026',
        reading: 1178.8,
        consumption: 18.9,
        status: 'Estimada',
    },
]

export const consumptionDataInfo = {
    source: 'simulated',
    description: 'Dados fictícios para demonstração da plataforma.',
    lastUpdated: '2026-10-31T23:59:00',
}