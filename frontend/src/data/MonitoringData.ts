
export interface MonitoringIndicator {
    title: string
    value: string
    unit: string
    status: string
    type: 'normal' | 'warning' | 'danger'
}

export const monitoringIndicators: MonitoringIndicator[] = [
    {
        title: 'Vazão atual',
        value: '128,5',
        unit: 'm³/h',
        status: 'Dentro do esperado',
        type: 'normal',
    },
    {
        title: 'Pressão média',
        value: '32,8',
        unit: 'mca',
        status: 'Estável',
        type: 'normal',
    },
    {
        title: 'Volume monitorado',
        value: '3.084',
        unit: 'm³',
        status: 'Últimas 24 horas',
        type: 'normal',
    },
    {
        title: 'Sensores ativos',
        value: '24 / 26',
        unit: '',
        status: '2 indisponíveis',
        type: 'warning',
    },
]

export interface MonitoringReading {
    time: string
    flow: number
    pressure: number
}

export const monitoringReadings: MonitoringReading[] = [
    { time: '00:00', flow: 110, pressure: 31.2 },
    { time: '02:00', flow: 105, pressure: 30.8 },
    { time: '04:00', flow: 98, pressure: 30.5 },
    { time: '06:00', flow: 115, pressure: 31.4 },
    { time: '08:00', flow: 132, pressure: 33.1 },
    { time: '10:00', flow: 140, pressure: 34.2 },
    { time: '12:00', flow: 128, pressure: 32.8 },
    { time: '14:00', flow: 135, pressure: 33.5 },
    { time: '16:00', flow: 142, pressure: 34.1 },
    { time: '18:00', flow: 128, pressure: 32.8 },
    { time: '20:00', flow: 120, pressure: 32.0 },
    { time: '22:00', flow: 112, pressure: 31.5 },
]

export const monitoringDataInfo = {
    source: 'simulated',
    description: 'Dados fictícios para desenvolvimento da interface.',
    lastUpdated: '2026-11-01T00:00:00',
}
