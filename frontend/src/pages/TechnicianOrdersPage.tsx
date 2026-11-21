import { useEffect, useMemo, useState } from 'react'

import { changeWorkOrderStatus, listWorkOrders } from '../api/operations'
import {
    formatDateTime,
    priorityLabel,
    workOrderStatusLabel,
    type WorkOrder,
    type WorkOrderStatus,
} from '../api/types'

import './TechnicianOrdersPage.css'

// 'Todas' mostra tudo; os demais são os status da API.
type StatusFilter = 'Todas' | WorkOrderStatus

// Ordem em que os status aparecem nos selects.
const statusOptions: WorkOrderStatus[] = ['pending', 'in_progress', 'completed', 'canceled']

// As classes CSS usam o texto em minúsculas, com hífen no lugar de espaço.
// Ex.: "Em andamento" vira "em-andamento".
function cssKey(label: string) {
    return label.toLowerCase().replaceAll(' ', '-')
}

function errorMessage(err: unknown) {
    return err instanceof Error ? err.message : 'Erro inesperado.'
}

function TechnicianOrdersPage() {
    const [orders, setOrders] = useState<WorkOrder[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [loadError, setLoadError] = useState('')
    const [actionError, setActionError] = useState('')
    const [filter, setFilter] = useState<StatusFilter>('Todas')
    // Guarda só o id da ordem aberta no modal; os dados vêm da lista.
    const [selectedId, setSelectedId] = useState<number | null>(null)

    // Busca as ordens do técnico assim que a tela abre.
    useEffect(() => {
        listWorkOrders()
            .then((data) => setOrders(data.results))
            .catch((err) => setLoadError(errorMessage(err)))
            .finally(() => setIsLoading(false))
    }, [])

    const selectedOrder = orders.find((order) => order.id === selectedId) ?? null

    // Lista filtrada pelo status escolhido no select.
    const filteredOrders = useMemo(
        () =>
            orders.filter((order) =>
                filter === 'Todas' ? true : order.status === filter,
            ),
        [orders, filter],
    )

    // Números mostrados nos cards de resumo.
    const counts = {
        total: orders.length,
        pending: orders.filter((order) => order.status === 'pending').length,
        progress: orders.filter((order) => order.status === 'in_progress').length,
        completed: orders.filter((order) => order.status === 'completed').length,
    }

    // Envia a troca de status para a API e atualiza a ordem na lista com a resposta.
    async function updateStatus(id: number, status: WorkOrderStatus) {
        setActionError('')
        try {
            const updated = await changeWorkOrderStatus(id, status)
            setOrders((current) =>
                current.map((order) => (order.id === id ? updated : order)),
            )
        } catch (err) {
            setActionError(errorMessage(err))
        }
    }

    return (
        <section className="technician-orders">
            <header className="technician-heading">
                <div>
                    <span className="technician-eyebrow">ÁREA TÉCNICA</span>
                    <h1>Minhas ordens</h1>
                    <p>Acompanhe e gerencie os serviços atribuídos a você.</p>
                </div>
            </header>

            <div className="technician-order-summary">
                <article className="technician-summary-card">
                    <span>Total de ordens</span>
                    <strong>{counts.total}</strong>
                </article>

                <article className="technician-summary-card">
                    <span>Pendentes</span>
                    <strong>{counts.pending}</strong>
                </article>

                <article className="technician-summary-card">
                    <span>Em andamento</span>
                    <strong>{counts.progress}</strong>
                </article>

                <article className="technician-summary-card">
                    <span>Concluídas</span>
                    <strong>{counts.completed}</strong>
                </article>
            </div>

            <div className="technician-orders-toolbar">
                <div>
                    <h2>Ordens de serviço</h2>
                    <p>Serviços sob sua responsabilidade.</p>
                </div>

                <select
                    value={filter}
                    onChange={(event) => setFilter(event.target.value as StatusFilter)}
                    aria-label="Filtrar ordens por status"
                >
                    <option value="Todas">Todas as ordens</option>
                    {statusOptions.map((status) => (
                        <option key={status} value={status}>
                            {workOrderStatusLabel[status]}
                        </option>
                    ))}
                </select>
            </div>

            <div className="technician-order-list">
                {isLoading ? (
                    <div className="technician-empty">Carregando ordens...</div>
                ) : loadError ? (
                    <div className="technician-empty" role="alert">{loadError}</div>
                ) : filteredOrders.length === 0 ? (
                    <div className="technician-empty">
                        Nenhuma ordem encontrada para este filtro.
                    </div>
                ) : (
                    filteredOrders.map((order) => {
                        const priority = priorityLabel[order.priority]
                        const status = workOrderStatusLabel[order.status]

                        return (
                            <article className="technician-order-card" key={order.id}>
                                <div className="technician-order-card__main">
                                    <div className="technician-order-card__top">
                                        <span className="technician-order-id">OS-{order.id}</span>

                                        <span className={`technician-priority technician-priority--${cssKey(priority)}`}>
                                            {priority}
                                        </span>
                                    </div>

                                    <h3>{order.title}</h3>
                                    <p>{order.description}</p>

                                    <div className="technician-order-meta">
                                        <span>Ocorrência: #{order.occurrence}</span>
                                        <span>Prazo: {formatDateTime(order.due_at)}</span>
                                    </div>
                                </div>

                                <div className="technician-order-card__actions">
                                    <span className={`technician-status technician-status--${cssKey(status)}`}>
                                        {status}
                                    </span>

                                    <button
                                        type="button"
                                        onClick={() => {
                                            setActionError('')
                                            setSelectedId(order.id)
                                        }}
                                    >
                                        Ver detalhes
                                    </button>
                                </div>
                            </article>
                        )
                    })
                )}
            </div>

            {selectedOrder && (
                <div
                    className="technician-modal-backdrop"
                    onMouseDown={(event) => {
                        // Fecha o modal só se o clique foi no fundo escuro, não dentro dele.
                        if (event.target === event.currentTarget) {
                            setSelectedId(null)
                        }
                    }}
                >
                    <section
                        className="technician-modal"
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="technician-order-modal-title"
                    >
                        <div className="technician-modal__header">
                            <div>
                                <span className="technician-order-id">OS-{selectedOrder.id}</span>
                                <h2 id="technician-order-modal-title">{selectedOrder.title}</h2>
                            </div>

                            <button
                                type="button"
                                className="technician-modal__close"
                                onClick={() => setSelectedId(null)}
                                aria-label="Fechar detalhes"
                            >
                                ×
                            </button>
                        </div>

                        <p>{selectedOrder.description}</p>

                        <dl className="technician-order-details">
                            <div>
                                <dt>Ocorrência</dt>
                                <dd>#{selectedOrder.occurrence}</dd>
                            </div>
                            <div>
                                <dt>Prioridade</dt>
                                <dd>{priorityLabel[selectedOrder.priority]}</dd>
                            </div>
                            <div>
                                <dt>Prazo</dt>
                                <dd>{formatDateTime(selectedOrder.due_at)}</dd>
                            </div>
                            <div>
                                <dt>Data de abertura</dt>
                                <dd>{formatDateTime(selectedOrder.created_at)}</dd>
                            </div>
                        </dl>

                        <label htmlFor="technician-order-status">Atualizar status</label>

                        <select
                            id="technician-order-status"
                            value={selectedOrder.status}
                            onChange={(event) =>
                                updateStatus(selectedOrder.id, event.target.value as WorkOrderStatus)
                            }
                        >
                            {statusOptions.map((status) => (
                                <option key={status} value={status}>
                                    {workOrderStatusLabel[status]}
                                </option>
                            ))}
                        </select>

                        {actionError && (
                            <p className="technician-modal__notice" role="alert">{actionError}</p>
                        )}
                    </section>
                </div>
            )}
        </section>
    )
}

export default TechnicianOrdersPage