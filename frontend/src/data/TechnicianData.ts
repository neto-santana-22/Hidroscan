
export type WorkOrderStatus =
    | 'Pendente'
    | 'Em andamento'
    | 'Concluída'

export type WorkOrderPriority =
    | 'Baixa'
    | 'Média'
    | 'Alta'
    | 'Crítica'

export interface WorkOrder {
    id: string
    title: string
    description: string
    location: string
    equipment: string
    priority: WorkOrderPriority
    status: WorkOrderStatus
    createdAt: string
    deadline: string
}

export interface TechnicalEquipment {
    id: string
    name: string
    type: string
    location: string
    status: 'Operacional' | 'Atenção' | 'Offline'
    lastMaintenance: string
    lastCommunication: string
    battery: number
}

export const initialWorkOrders: WorkOrder[] = [
    {
        id: 'OS-2026-0142',
        title: 'Verificação de sensor de pressão',
        description:
            'Investigar variação de pressão identificada no setor de distribuição.',
        location: 'Setor Norte — Rua das Flores',
        equipment: 'SEN-PRE-024',
        priority: 'Alta',
        status: 'Pendente',
        createdAt: '30/10/2026',
        deadline: '02/11/2026',
    },
    {
        id: 'OS-2026-0139',
        title: 'Manutenção de hidrômetro',
        description:
            'Verificar funcionamento e realizar inspeção do hidrômetro.',
        location: 'Setor Central — Rua do Comércio',
        equipment: 'HID-018',
        priority: 'Média',
        status: 'Em andamento',
        createdAt: '29/10/2026',
        deadline: '03/11/2026',
    },
    {
        id: 'OS-2026-0135',
        title: 'Inspeção de sensor de vazão',
        description:
            'Verificar comunicação e realizar inspeção preventiva do equipamento.',
        location: 'Setor Sul — Avenida Principal',
        equipment: 'SEN-VAZ-011',
        priority: 'Crítica',
        status: 'Pendente',
        createdAt: '28/10/2026',
        deadline: '01/11/2026',
    },
    {
        id: 'OS-2026-0128',
        title: 'Revisão de equipamento',
        description:
            'Realizar revisão periódica do equipamento e registrar os resultados.',
        location: 'Setor Leste — Rua da Estação',
        equipment: 'SEN-PRE-008',
        priority: 'Baixa',
        status: 'Concluída',
        createdAt: '25/10/2026',
        deadline: '30/10/2026',
    },
]

export const technicalEquipments: TechnicalEquipment[] = [
    {
        id: 'SEN-PRE-024',
        name: 'Sensor de pressão',
        type: 'Pressão',
        location: 'Setor Norte — Rua das Flores',
        status: 'Atenção',
        lastMaintenance: '12/09/2026',
        lastCommunication: '01/11/2026 14:32',
        battery: 72,
    },
    {
        id: 'SEN-VAZ-011',
        name: 'Sensor de vazão',
        type: 'Vazão',
        location: 'Setor Sul — Avenida Principal',
        status: 'Offline',
        lastMaintenance: '05/08/2026',
        lastCommunication: '31/10/2026 08:15',
        battery: 0,
    },
    {
        id: 'HID-018',
        name: 'Hidrômetro digital',
        type: 'Hidrômetro',
        location: 'Setor Central — Rua do Comércio',
        status: 'Operacional',
        lastMaintenance: '20/09/2026',
        lastCommunication: '01/11/2026 15:10',
        battery: 89,
    },
    {
        id: 'SEN-PRE-008',
        name: 'Sensor de pressão',
        type: 'Pressão',
        location: 'Setor Leste — Rua da Estação',
        status: 'Operacional',
        lastMaintenance: '25/10/2026',
        lastCommunication: '01/11/2026 15:08',
        battery: 95,
    },
]

export const technicianDataInfo = {
    source: 'simulated',
    description: 'Dados fictícios para demonstração da plataforma.',
}


export type TechnicalAlertSeverity = 'Crítica' | 'Alta' | 'Média' | 'Baixa'

export interface TechnicalAlert {
    id: string
    title: string
    description: string
    equipment: string
    location: string
    severity: TechnicalAlertSeverity
    date: string
    acknowledged: boolean
}

export interface TechnicalIntervention {
    id: string
    title: string
    equipment: string
    location: string
    technician: string
    date: string
    type: 'Manutenção preventiva' | 'Manutenção corretiva' | 'Inspeção'
    result: string
}

export const technicalAlerts: TechnicalAlert[] = [
    {
        id: 'ALT-2026-0081',
        title: 'Sensor sem comunicação',
        description: 'O dispositivo deixou de transmitir dados para a central de monitoramento.',
        equipment: 'SEN-VAZ-011',
        location: 'Setor Sul — Avenida Principal',
        severity: 'Crítica',
        date: '01/11/2026 08:15',
        acknowledged: false,
    },
    {
        id: 'ALT-2026-0079',
        title: 'Variação de pressão',
        description: 'Foi identificada uma variação de pressão acima do limite configurado.',
        equipment: 'SEN-PRE-024',
        location: 'Setor Norte — Rua das Flores',
        severity: 'Alta',
        date: '01/11/2026 07:42',
        acknowledged: false,
    },
    {
        id: 'ALT-2026-0075',
        title: 'Bateria com nível reduzido',
        description: 'O nível de bateria do equipamento está abaixo do limite de atenção.',
        equipment: 'SEN-PRE-016',
        location: 'Setor Central — Rua do Comércio',
        severity: 'Média',
        date: '31/10/2026 16:20',
        acknowledged: true,
    },
    {
        id: 'ALT-2026-0072',
        title: 'Manutenção preventiva programada',
        description: 'O equipamento está próximo da data recomendada para manutenção.',
        equipment: 'HID-018',
        location: 'Setor Central — Rua do Comércio',
        severity: 'Baixa',
        date: '30/10/2026 10:00',
        acknowledged: true,
    },
]

export const technicalInterventions: TechnicalIntervention[] = [
    {
        id: 'INT-2026-0034',
        title: 'Inspeção de sensor de pressão',
        equipment: 'SEN-PRE-008',
        location: 'Setor Leste — Rua da Estação',
        technician: 'João Oliveira',
        date: '30/10/2026',
        type: 'Inspeção',
        result: 'Equipamento verificado e funcionamento normal confirmado.',
    },
    {
        id: 'INT-2026-0031',
        title: 'Substituição de componente',
        equipment: 'SEN-VAZ-006',
        location: 'Setor Norte — Rua das Flores',
        technician: 'João Oliveira',
        date: '27/10/2026',
        type: 'Manutenção corretiva',
        result: 'Componente substituído e comunicação restabelecida.',
    },
    {
        id: 'INT-2026-0028',
        title: 'Revisão periódica',
        equipment: 'HID-012',
        location: 'Setor Central — Rua do Comércio',
        technician: 'João Oliveira',
        date: '24/10/2026',
        type: 'Manutenção preventiva',
        result: 'Revisão concluída sem identificação de anormalidades.',
    },
    {
        id: 'INT-2026-0022',
        title: 'Inspeção de equipamento',
        equipment: 'SEN-PRE-004',
        location: 'Setor Sul — Avenida Principal',
        technician: 'João Oliveira',
        date: '20/10/2026',
        type: 'Inspeção',
        result: 'Identificada necessidade de acompanhamento da pressão.',
    },
]
