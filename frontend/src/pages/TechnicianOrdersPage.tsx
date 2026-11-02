
import { useMemo, useState } from 'react'
import {
    initialWorkOrders,
    type WorkOrder,
    type WorkOrderStatus,
} from '../data/TechnicianData'

import './TechnicianOrdersPage.css'

type StatusFilter = 'Todas' | WorkOrderStatus

function TechnicianOrdersPage() {
    const [orders, setOrders] = useState<WorkOrder[]>(initialWorkOrders)
    const [filter, setFilter] = useState<StatusFilter>('Todas')
    const [selectedOrder, setSelectedOrder] = useState<WorkOrder | null>(null)

    const filteredOrders = useMemo(
        () =>
            orders.filter((order) =>
                filter === 'Todas' ? true : order.status === filter,
            ),
        [orders, filter],
    )

    const counts = {
        total: orders.length,
        pending: orders.filter((order) => order.status === 'Pendente').length,
        progress: orders.filter(
            (order) => order.status === 'Em andamento',
        ).length,
        completed: orders.filter(
            (order) => order.status === 'Concluída',
        ).length,
    }

    function updateStatus(id: string, status: WorkOrderStatus) {
        setOrders((current) =>
            current.map((order) =>
                order.id === id ? { ...order, status } : order,
            ),
        )

        setSelectedOrder((current) =>
            current?.id === id ? { ...current, status } : current,
        )
    }

    return (
        <section className="technician-orders">
            <header className="technician-heading">
                <div>
                    <span className="technician-eyebrow">ÁREA TÉCNICA</span>
                    <h1>Minhas ordens</h1>
                    <p>Acompanhe e gerencie os serviços atribuídos a você.</p>
                </div>

                <span className="technician-data-label">Dados simulados</span>
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
                    onChange={(event) =>
                        setFilter(event.target.value as StatusFilter)
                    }
                    aria-label="Filtrar ordens por status"
                >
                    <option value="Todas">Todas as ordens</option>
                    <option value="Pendente">Pendentes</option>
                    <option value="Em andamento">Em andamento</option>
                    <option value="Concluída">Concluídas</option>
                </select>
            </div>

            <div className="technician-order-list">
                {filteredOrders.length === 0 ? (
                    <div className="technician-empty">
                        Nenhuma ordem encontrada para este filtro.
                    </div>
                ) : (
                    filteredOrders.map((order) => (
                        <article className="technician-order-card" key={order.id}>
                            <div className="technician-order-card__main">
                                <div className="technician-order-card__top">
                                    <span className="technician-order-id">{order.id}</span>

                                    <span
                                        className={`technician-priority technician-priority--${order.priority.toLowerCase()}`}
                                    >
                                        {order.priority}
                                    </span>
                                </div>

                                <h3>{order.title}</h3>
                                <p>{order.location}</p>

                                <div className="technician-order-meta">
                                    <span>Equipamento: {order.equipment}</span>
                                    <span>Prazo: {order.deadline}</span>
                                </div>
                            </div>

                            <div className="technician-order-card__actions">
                                <span
                                    className={`technician-status technician-status--${order.status.toLowerCase().replaceAll(' ', '-')}`}
                                >
                                    {order.status}
                                </span>

                                <button
                                    type="button"
                                    onClick={() => setSelectedOrder(order)}
                                >
                                    Ver detalhes
                                </button>
                            </div>
                        </article>
                    ))
                )}
            </div>

            {selectedOrder && (
                <div
                    className="technician-modal-backdrop"
                    onMouseDown={(event) => {
                        if (event.target === event.currentTarget) {
                            setSelectedOrder(null)
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
                                <span className="technician-order-id">
                                    {selectedOrder.id}
                                </span>
                                <h2 id="technician-order-modal-title">
                                    {selectedOrder.title}
                                </h2>
                            </div>

                            <button
                                type="button"
                                className="technician-modal__close"
                                onClick={() => setSelectedOrder(null)}
                                aria-label="Fechar detalhes"
                            >
                                ×
                            </button>
                        </div>

                        <p>{selectedOrder.description}</p>

                        <dl className="technician-order-details">
                            <div>
                                <dt>Localização</dt>
                                <dd>{selectedOrder.location}</dd>
                            </div>
                            <div>
                                <dt>Equipamento</dt>
                                <dd>{selectedOrder.equipment}</dd>
                            </div>
                            <div>
                                <dt>Prioridade</dt>
                                <dd>{selectedOrder.priority}</dd>
                            </div>
                            <div>
                                <dt>Prazo</dt>
                                <dd>{selectedOrder.deadline}</dd>
                            </div>
                            <div>
                                <dt>Data de abertura</dt>
                                <dd>{selectedOrder.createdAt}</dd>
                            </div>
                        </dl>

                        <label htmlFor="technician-order-status">
                            Atualizar status
                        </label>

                        <select
                            id="technician-order-status"
                            value={selectedOrder.status}
                            onChange={(event) =>
                                updateStatus(
                                    selectedOrder.id,
                                    event.target.value as WorkOrderStatus,
                                )
                            }
                        >
                            <option value="Pendente">Pendente</option>
                            <option value="Em andamento">Em andamento</option>
                            <option value="Concluída">Concluída</option>
                        </select>

                        <p className="technician-modal__notice">
                            A alteração é temporária e será perdida ao atualizar a página.
                        </p>
                    </section>
                </div>
            )}
        </section>
    )
}

export default TechnicianOrdersPage
