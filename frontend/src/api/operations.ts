import { apiFetch } from './client'
import type {
    Alert,
    Paginated,
    Property,
    ResidentRequest,
    ResidentRequestCategory,
    WorkOrder,
    WorkOrderStatus,
} from './types'

// Lista os alertas que o técnico pode ver (a API já filtra pelo escopo da região).
export function listAlerts() {
    return apiFetch<Paginated<Alert>>('/api/alertas/')
}

// Marca um alerta como reconhecido pelo técnico.
export function acknowledgeAlert(id: number) {
    return apiFetch<Alert>(`/api/alertas/${id}/reconhecer/`, { method: 'POST' })
}

// Lista as ordens de serviço. Para o técnico, a API devolve só as atribuídas a ele.
export function listWorkOrders() {
    return apiFetch<Paginated<WorkOrder>>('/api/ordens-servico/')
}

// Troca o status de uma ordem (ex.: de 'pending' para 'in_progress').
export function changeWorkOrderStatus(id: number, status: WorkOrderStatus) {
    return apiFetch<WorkOrder>(`/api/ordens-servico/${id}/status/`, {
        method: 'POST',
        body: { status },
    })
}

// Lista as solicitações do morador logado.
export function listResidentRequests() {
    return apiFetch<Paginated<ResidentRequest>>('/api/solicitacoes/')
}

// Cria uma nova solicitação para um dos imóveis do morador.
export function createResidentRequest(payload: {
    property: number
    category: ResidentRequestCategory
    description: string
}) {
    return apiFetch<ResidentRequest>('/api/solicitacoes/', { method: 'POST', body: payload })
}

// Lista os imóveis do morador, para ele escolher onde abrir a solicitação.
export function listProperties() {
    return apiFetch<Paginated<Property>>('/api/imoveis/')
}