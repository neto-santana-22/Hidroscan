// Formatos de dados que a API Django devolve.
// Os nomes dos campos são os mesmos do backend (em inglês), e os rótulos
// exibidos ao usuário ficam em português, mais abaixo neste arquivo.

// Resposta paginada do Django REST Framework (listas).
// "results" é a lista de itens da página atual; "count" é o total de registros.
export interface Paginated<T> {
    count: number
    next: string | null
    previous: string | null
    results: T[]
}

// Prioridade e severidade usam os mesmos valores no backend.
export type Priority = 'low' | 'medium' | 'high' | 'critical'

// Status possíveis de uma ordem de serviço (WorkOrder.Status no backend).
export type WorkOrderStatus = 'pending' | 'in_progress' | 'completed' | 'canceled'

// Uma ordem de serviço atribuída a um técnico.
export interface WorkOrder {
    id: number
    occurrence: number            // id da ocorrência que originou a ordem
    assigned_to: number | null    // id do técnico responsável
    title: string
    description: string
    priority: Priority
    status: WorkOrderStatus
    due_at: string | null         // prazo em ISO (UTC); null se não houver
    created_by: number
    created_at: string
    updated_at: string
}

// Status de um alerta: aberto, reconhecido pelo técnico ou resolvido.
export type AlertStatus = 'open' | 'acknowledged' | 'resolved'

// Um alerta gerado pelo motor de regras a partir das leituras.
export interface Alert {
    id: number
    property: number
    device: number
    rule_code: string             // código interno da regra que disparou
    title: string
    description: string
    severity: Priority            // reaproveita a mesma escala de prioridade
    status: AlertStatus
    first_detected_at: string
    last_detected_at: string
    occurrences_count: number     // quantas vezes a regra disparou desde o primeiro alerta
    acknowledged_at: string | null
    acknowledged_by: number | null
}

// Categorias de solicitação que o morador pode abrir.
export type ResidentRequestCategory = 'leak' | 'meter' | 'billing' | 'other'

// Situação de uma solicitação do morador.
export type ResidentRequestStatus = 'open' | 'under_review' | 'completed' | 'canceled'

// Solicitação aberta pelo morador para um dos seus imóveis.
export interface ResidentRequest {
    id: number
    property: number
    requester: number
    category: ResidentRequestCategory
    description: string
    status: ResidentRequestStatus
    resolution: string            // parecer final; vazio enquanto não concluída
    created_at: string
    updated_at: string
}

// Imóvel cadastrado (o morador vê só os imóveis dos quais é proprietário).
export interface Property {
    id: number
    name: string
    address: string
    region: number
    owner: number
    active: boolean
}

// Rótulos em português para exibir na tela.
// Ex.: priorityLabel['high'] === 'Alta'. Usar estes objetos evita espalhar
// textos traduzidos pelos componentes.

export const priorityLabel: Record<Priority, string> = {
    low: 'Baixa',
    medium: 'Média',
    high: 'Alta',
    critical: 'Crítica',
}

export const workOrderStatusLabel: Record<WorkOrderStatus, string> = {
    pending: 'Pendente',
    in_progress: 'Em andamento',
    completed: 'Concluída',
    canceled: 'Cancelada',
}

export const alertStatusLabel: Record<AlertStatus, string> = {
    open: 'Aberto',
    acknowledged: 'Reconhecido',
    resolved: 'Resolvido',
}

export const residentRequestCategoryLabel: Record<ResidentRequestCategory, string> = {
    leak: 'Vazamento',
    meter: 'Hidrômetro',
    billing: 'Consumo/faturamento',
    other: 'Outro',
}

export const residentRequestStatusLabel: Record<ResidentRequestStatus, string> = {
    open: 'Aberta',
    under_review: 'Em análise',
    completed: 'Concluída',
    canceled: 'Cancelada',
}

// Converte a data da API (UTC) para texto no fuso de Recife, no formato brasileiro.
// Se não houver data (null), mostra um traço.
export function formatDateTime(value: string | null): string {
    if (!value) return '—'
    return new Date(value).toLocaleString('pt-BR', {
        timeZone: 'America/Recife',
        dateStyle: 'short',
        timeStyle: 'short',
    })
}