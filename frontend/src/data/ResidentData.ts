
export interface ConsumptionReading {
    day: string
    consumption: number
}

export interface ResidentNotice {
    id: number
    title: string
    description: string
    date: string
    type: 'info' | 'warning' | 'success'
}

export interface ResidentRequest {
    id: string
    title: string
    date: string
    status: 'Em análise' | 'Em andamento' | 'Concluída'
}

export const residentSummary = {
    consumerName: 'Maria Silva',
    unit: 'Unidade consumidora 001245',
    currentConsumption: '18,5',
    consumptionUnit: 'm³',
    previousConsumption: '21,2',
    dailyAverage: '0,62',
    comparison: '12,7% menor que o mês anterior',
    supplyStatus: 'Abastecimento normal',
    lastReading: '30/10/2026',
}

export const residentConsumption: ConsumptionReading[] = [
    { day: '01/10', consumption: 0.55 },
    { day: '04/10', consumption: 0.68 },
    { day: '07/10', consumption: 0.61 },
    { day: '10/10', consumption: 0.72 },
    { day: '13/10', consumption: 0.58 },
    { day: '16/10', consumption: 0.65 },
    { day: '19/10', consumption: 0.74 },
    { day: '22/10', consumption: 0.59 },
    { day: '25/10', consumption: 0.63 },
    { day: '28/10', consumption: 0.57 },
    { day: '31/10', consumption: 0.62 },
]

export const residentNotices: ResidentNotice[] = [
    {
        id: 1,
        title: 'Abastecimento normalizado',
        description:
            'O fornecimento de água na sua região está operando normalmente.',
        date: '31/10/2026',
        type: 'success',
    },
    {
        id: 2,
        title: 'Atualização do sistema',
        description:
            'O portal recebeu melhorias para acompanhamento do consumo.',
        date: '28/10/2026',
        type: 'info',
    },
]

export const residentRequests: ResidentRequest[] = [
    {
        id: 'SOL-0018',
        title: 'Verificação de hidrômetro',
        date: '29/10/2026',
        status: 'Em andamento',
    },
    {
        id: 'SOL-0012',
        title: 'Dúvida sobre consumo',
        date: '20/10/2026',
        status: 'Concluída',
    },
]
