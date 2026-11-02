
import { useMemo, useState } from 'react'
import {
    technicalAlerts,
    type TechnicalAlert,
    type TechnicalAlertSeverity,
} from '../data/TechnicianData'

import './TechnicianAlertsPage.css'

type AlertFilter = 'Todos' | TechnicalAlertSeverity | 'Não reconhecidos'

function TechnicianAlertsPage() {
    const [alerts, setAlerts] = useState<TechnicalAlert[]>(technicalAlerts)
    const [filter, setFilter] = useState<AlertFilter>('Todos')
    const [search, setSearch] = useState('')

    const filteredAlerts = useMemo(() => {
        const term = search.trim().toLowerCase()

        return alerts.filter((alert) => {
            const matchesFilter =
                filter === 'Todos' ||
                (filter === 'Não reconhecidos'
                    ? !alert.acknowledged
                    : alert.severity === filter)

            const matchesSearch = [
                alert.id,
                alert.title,
                alert.equipment,
                alert.location,
            ].some((value) => value.toLowerCase().includes(term))

            return matchesFilter && matchesSearch
        })
    }, [alerts, filter, search])

    const pendingCount = alerts.filter(
        (alert) => !alert.acknowledged,
    ).length

    const criticalCount = alerts.filter(
        (alert) => alert.severity === 'Crítica' && !alert.acknowledged,
    ).length

    function acknowledgeAlert(id: string) {
        setAlerts((current) =>
            current.map((alert) =>
                alert.id === id ? { ...alert, acknowledged: true } : alert,
            ),
        )
    }

    return (
        <section className="technician-alerts">
            <header className="technician-heading">
                <div>
                    <span className="technician-eyebrow">ÁREA TÉCNICA</span>
                    <h1>Alertas técnicos</h1>
                    <p>Acompanhe eventos que exigem atenção da equipe técnica.</p>
                </div>
                <span className="technician-data-label">Dados simulados</span>
            </header>

            <div className="technician-alert-summary">
                <article>
                    <span>Total de alertas</span>
                    <strong>{alerts.length}</strong>
                </article>
                <article>
                    <span>Não reconhecidos</span>
                    <strong>{pendingCount}</strong>
                </article>
                <article>
                    <span>Críticos pendentes</span>
                    <strong>{criticalCount}</strong>
                </article>
            </div>

            <div className="technician-alert-toolbar">
                <input
                    type="search"
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Buscar por alerta, equipamento ou local..."
                    aria-label="Buscar alertas técnicos"
                />

                <select
                    value={filter}
                    onChange={(event) =>
                        setFilter(event.target.value as AlertFilter)
                    }
                    aria-label="Filtrar alertas"
                >
                    <option value="Todos">Todos os alertas</option>
                    <option value="Não reconhecidos">Não reconhecidos</option>
                    <option value="Crítica">Críticos</option>
                    <option value="Alta">Alta prioridade</option>
                    <option value="Média">Média prioridade</option>
                    <option value="Baixa">Baixa prioridade</option>
                </select>
            </div>

            <div className="technician-alert-list">
                {filteredAlerts.length === 0 ? (
                    <div className="technician-empty">
                        Nenhum alerta encontrado.
                    </div>
                ) : (
                    filteredAlerts.map((alert) => (
                        <article
                            className={`technician-alert-card technician-alert-card--${alert.severity.toLowerCase()}`}
                            key={alert.id}
                        >
                            <div className="technician-alert-card__header">
                                <div>
                                    <span className="technician-order-id">{alert.id}</span>
                                    <h2>{alert.title}</h2>
                                </div>

                                <span
                                    className={`technician-alert-severity technician-alert-severity--${alert.severity.toLowerCase()}`}
                                >
                                    {alert.severity}
                                </span>
                            </div>

                            <p className="technician-alert-description">
                                {alert.description}
                            </p>

                            <div className="technician-alert-details">
                                <span>Equipamento: <strong>{alert.equipment}</strong></span>
                                <span>Local: <strong>{alert.location}</strong></span>
                                <span>Data: <strong>{alert.date}</strong></span>
                            </div>

                            <div className="technician-alert-card__footer">
                                <span
                                    className={
                                        alert.acknowledged
                                            ? 'technician-alert-acknowledged'
                                            : 'technician-alert-pending'
                                    }
                                >
                                    {alert.acknowledged
                                        ? 'Alerta reconhecido'
                                        : 'Aguardando reconhecimento'}
                                </span>

                                {!alert.acknowledged && (
                                    <button
                                        type="button"
                                        onClick={() => acknowledgeAlert(alert.id)}
                                    >
                                        Reconhecer alerta
                                    </button>
                                )}
                            </div>
                        </article>
                    ))
                )}
            </div>

            <p className="technician-alert-disclaimer">
                Reconhecer um alerta registra apenas a ciência do técnico nesta
                demonstração. Não significa que o problema foi solucionado.
            </p>
        </section>
    )
}

export default TechnicianAlertsPage
