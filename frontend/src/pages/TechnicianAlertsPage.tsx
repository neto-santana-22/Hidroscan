import { useEffect, useMemo, useState } from 'react'

import { acknowledgeAlert, listAlerts } from '../api/operations'
import {
    alertStatusLabel,
    formatDateTime,
    priorityLabel,
    type Alert,
    type Priority,
} from '../api/types'

import './TechnicianAlertsPage.css'

// 'Todos' e 'Abertos' são filtros de situação; os demais filtram pela severidade.
type AlertFilter = 'Todos' | 'Abertos' | Priority

// Transforma o texto em classe CSS. Ex.: "Média" vira "média".
function cssKey(label: string) {
    return label.toLowerCase().replaceAll(' ', '-')
}

function errorMessage(err: unknown) {
    return err instanceof Error ? err.message : 'Erro inesperado.'
}

function TechnicianAlertsPage() {
    const [alerts, setAlerts] = useState<Alert[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [loadError, setLoadError] = useState('')
    const [actionError, setActionError] = useState('')
    const [filter, setFilter] = useState<AlertFilter>('Todos')
    const [search, setSearch] = useState('')

    // Busca os alertas que o técnico pode ver quando a tela abre.
    useEffect(() => {
        listAlerts()
            .then((data) => setAlerts(data.results))
            .catch((err) => setLoadError(errorMessage(err)))
            .finally(() => setIsLoading(false))
    }, [])

    // Aplica o filtro escolhido e a busca por texto.
    const filteredAlerts = useMemo(() => {
        const term = search.trim().toLowerCase()

        return alerts.filter((alert) => {
            const matchesFilter =
                filter === 'Todos' ||
                (filter === 'Abertos' ? alert.status === 'open' : alert.severity === filter)

            const matchesSearch = [alert.title, alert.description, alert.rule_code].some((value) =>
                value.toLowerCase().includes(term),
            )

            return matchesFilter && matchesSearch
        })
    }, [alerts, filter, search])

    // Números dos cards de resumo.
    const openCount = alerts.filter((alert) => alert.status === 'open').length
    const criticalOpenCount = alerts.filter(
        (alert) => alert.severity === 'critical' && alert.status === 'open',
    ).length

    // Reconhece o alerta na API e substitui o item na lista pela resposta.
    async function handleAcknowledge(id: number) {
        setActionError('')
        try {
            const updated = await acknowledgeAlert(id)
            setAlerts((current) => current.map((alert) => (alert.id === id ? updated : alert)))
        } catch (err) {
            setActionError(errorMessage(err))
        }
    }

    return (
        <section className="technician-alerts">
            <header className="technician-heading">
                <div>
                    <span className="technician-eyebrow">ÁREA TÉCNICA</span>
                    <h1>Alertas técnicos</h1>
                    <p>Acompanhe eventos que exigem atenção da equipe técnica.</p>
                </div>
            </header>

            <div className="technician-alert-summary">
                <article>
                    <span>Total de alertas</span>
                    <strong>{alerts.length}</strong>
                </article>
                <article>
                    <span>Abertos</span>
                    <strong>{openCount}</strong>
                </article>
                <article>
                    <span>Críticos abertos</span>
                    <strong>{criticalOpenCount}</strong>
                </article>
            </div>

            <div className="technician-alert-toolbar">
                <input
                    type="search"
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Buscar por título ou descrição..."
                    aria-label="Buscar alertas técnicos"
                />

                <select
                    value={filter}
                    onChange={(event) => setFilter(event.target.value as AlertFilter)}
                    aria-label="Filtrar alertas"
                >
                    <option value="Todos">Todos os alertas</option>
                    <option value="Abertos">Somente abertos</option>
                    <option value="critical">Críticos</option>
                    <option value="high">Alta prioridade</option>
                    <option value="medium">Média prioridade</option>
                    <option value="low">Baixa prioridade</option>
                </select>
            </div>

            {actionError && (
                <p className="technician-alert-disclaimer" role="alert">{actionError}</p>
            )}

            <div className="technician-alert-list">
                {isLoading ? (
                    <div className="technician-empty">Carregando alertas...</div>
                ) : loadError ? (
                    <div className="technician-empty" role="alert">{loadError}</div>
                ) : filteredAlerts.length === 0 ? (
                    <div className="technician-empty">Nenhum alerta encontrado.</div>
                ) : (
                    filteredAlerts.map((alert) => {
                        const severity = priorityLabel[alert.severity]
                        // Qualquer status diferente de 'open' significa que o alerta já foi tratado.
                        const acknowledged = alert.status !== 'open'

                        return (
                            <article
                                className={`technician-alert-card technician-alert-card--${cssKey(severity)}`}
                                key={alert.id}
                            >
                                <div className="technician-alert-card__header">
                                    <div>
                                        <span className="technician-order-id">ALERTA-{alert.id}</span>
                                        <h2>{alert.title}</h2>
                                    </div>

                                    <span className={`technician-alert-severity technician-alert-severity--${cssKey(severity)}`}>
                                        {severity}
                                    </span>
                                </div>

                                <p className="technician-alert-description">{alert.description}</p>

                                <div className="technician-alert-details">
                                    <span>Imóvel: <strong>#{alert.property}</strong></span>
                                    <span>Dispositivo: <strong>#{alert.device}</strong></span>
                                    <span>Ocorrências: <strong>{alert.occurrences_count}</strong></span>
                                    <span>Detectado em: <strong>{formatDateTime(alert.last_detected_at)}</strong></span>
                                </div>

                                <div className="technician-alert-card__footer">
                                    <span className={acknowledged ? 'technician-alert-acknowledged' : 'technician-alert-pending'}>
                                        {alertStatusLabel[alert.status]}
                                    </span>

                                    {!acknowledged && (
                                        <button type="button" onClick={() => handleAcknowledge(alert.id)}>
                                            Reconhecer alerta
                                        </button>
                                    )}
                                </div>
                            </article>
                        )
                    })
                )}
            </div>

            <p className="technician-alert-disclaimer">
                Reconhecer um alerta registra apenas a ciência do técnico. Não significa que o problema foi solucionado.
            </p>
        </section>
    )
}

export default TechnicianAlertsPage