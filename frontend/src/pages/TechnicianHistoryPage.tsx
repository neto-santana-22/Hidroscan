import { useEffect, useMemo, useState } from 'react'

import { listWorkOrders } from '../api/operations'
import {
    formatDateTime,
    priorityLabel,
    workOrderStatusLabel,
    type WorkOrder,
} from '../api/types'

import './TechnicianHistoryPage.css'

// Só mostra ordens já encerradas: 'completed' ou 'canceled'.
type HistoryFilter = 'Todas' | 'completed' | 'canceled'

function errorMessage(err: unknown) {
    return err instanceof Error ? err.message : 'Erro inesperado.'
}

function TechnicianHistoryPage() {
    const [orders, setOrders] = useState<WorkOrder[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [loadError, setLoadError] = useState('')
    const [filter, setFilter] = useState<HistoryFilter>('Todas')
    const [search, setSearch] = useState('')

    // Carrega as ordens do técnico quando a tela abre.
    useEffect(() => {
        listWorkOrders()
            .then((data) => setOrders(data.results))
            .catch((err) => setLoadError(errorMessage(err)))
            .finally(() => setIsLoading(false))
    }, [])

    // Histórico é só o que já foi encerrado; o restante fica em "Minhas ordens".
    const closedOrders = useMemo(
        () => orders.filter((order) => order.status === 'completed' || order.status === 'canceled'),
        [orders],
    )

    // Aplica o filtro de situação e a busca por texto sobre as ordens encerradas.
    const filteredOrders = useMemo(() => {
        const term = search.trim().toLowerCase()

        return closedOrders.filter((order) => {
            const matchesStatus = filter === 'Todas' || order.status === filter
            const matchesSearch = [order.title, order.description].some((value) =>
                value.toLowerCase().includes(term),
            )
            return matchesStatus && matchesSearch
        })
    }, [closedOrders, filter, search])

    // Números dos cards de resumo.
    const completedCount = closedOrders.filter((order) => order.status === 'completed').length
    const canceledCount = closedOrders.filter((order) => order.status === 'canceled').length

    return (
        <section className="technician-history">
            <header className="technician-heading">
                <div>
                    <span className="technician-eyebrow">ÁREA TÉCNICA</span>
                    <h1>Histórico técnico</h1>
                    <p>Consulte as ordens de serviço já encerradas.</p>
                </div>
            </header>

            <div className="technician-history-summary">
                <article>
                    <span>Total encerradas</span>
                    <strong>{closedOrders.length}</strong>
                </article>
                <article>
                    <span>Concluídas</span>
                    <strong>{completedCount}</strong>
                </article>
                <article>
                    <span>Canceladas</span>
                    <strong>{canceledCount}</strong>
                </article>
            </div>

            <div className="technician-history-toolbar">
                <input
                    type="search"
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Buscar por título ou descrição..."
                    aria-label="Buscar no histórico técnico"
                />

                <select
                    value={filter}
                    onChange={(event) => setFilter(event.target.value as HistoryFilter)}
                    aria-label="Filtrar por situação"
                >
                    <option value="Todas">Todas</option>
                    <option value="completed">{workOrderStatusLabel.completed}</option>
                    <option value="canceled">{workOrderStatusLabel.canceled}</option>
                </select>
            </div>

            <div className="technician-history-list">
                {isLoading ? (
                    <div className="technician-empty">Carregando histórico...</div>
                ) : loadError ? (
                    <div className="technician-empty" role="alert">{loadError}</div>
                ) : filteredOrders.length === 0 ? (
                    <div className="technician-empty">Nenhuma ordem encerrada encontrada.</div>
                ) : (
                    filteredOrders.map((order) => (
                        <article className="technician-history-card" key={order.id}>
                            <div className="technician-history-card__header">
                                <div>
                                    <span className="technician-order-id">OS-{order.id}</span>
                                    <h2>{order.title}</h2>
                                </div>
                                <span className="technician-history-type">
                                    {workOrderStatusLabel[order.status]}
                                </span>
                            </div>

                            <p>{order.description}</p>

                            <div className="technician-history-details">
                                <div>
                                    <span>Ocorrência</span>
                                    <strong>#{order.occurrence}</strong>
                                </div>
                                <div>
                                    <span>Prioridade</span>
                                    <strong>{priorityLabel[order.priority]}</strong>
                                </div>
                                <div>
                                    <span>Aberta em</span>
                                    <strong>{formatDateTime(order.created_at)}</strong>
                                </div>
                                <div>
                                    <span>Última atualização</span>
                                    <strong>{formatDateTime(order.updated_at)}</strong>
                                </div>
                            </div>
                        </article>
                    ))
                )}
            </div>
        </section>
    )
}

export default TechnicianHistoryPage