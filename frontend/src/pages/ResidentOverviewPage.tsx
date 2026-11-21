import { useEffect, useMemo, useState } from 'react'
import {
    CartesianGrid,
    Line,
    LineChart,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from 'recharts'

import { apiFetch } from '../api/client'
import { listResidentRequests } from '../api/operations'
import {
    formatDateTime,
    residentRequestCategoryLabel,
    residentRequestStatusLabel,
    type Paginated,
    type Property,
    type ResidentRequest,
} from '../api/types'
import { useAuth } from '../contexts/AuthContext'
import { residentNotices } from '../data/ResidentData'

import './ResidentOverviewPage.css'

// Resposta de /api/dashboard/.
interface Dashboard {
    properties: number
    devices: number
    consumption_today: string | number
    last_reading_at: string | null
}

// Uma leitura de /api/imoveis/{id}/leituras/.
interface Reading {
    id: number
    device: number
    measured_at: string
    consumption: string | number
}

function errorMessage(err: unknown) {
    return err instanceof Error ? err.message : 'Erro inesperado.'
}

function ResidentOverviewPage() {
    const { user } = useAuth()

    const [dashboard, setDashboard] = useState<Dashboard | null>(null)
    const [readings, setReadings] = useState<Reading[]>([])
    const [requests, setRequests] = useState<ResidentRequest[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [loadError, setLoadError] = useState('')

    // Carrega tudo quando a tela abre. O gráfico usa o primeiro imóvel do morador.
    useEffect(() => {
        Promise.all([
            apiFetch<Dashboard>('/api/dashboard/'),
            apiFetch<Paginated<Property>>('/api/imoveis/'),
            listResidentRequests(),
        ])
            .then(async ([dashboardData, propertyData, requestData]) => {
                setDashboard(dashboardData)
                setRequests(requestData.results)

                if (propertyData.results.length > 0) {
                    const propertyId = propertyData.results[0].id
                    const readingData = await apiFetch<Reading[]>(
                        `/api/imoveis/${propertyId}/leituras/?limite=200`,
                    )
                    setReadings(readingData)
                }
            })
            .catch((err) => setLoadError(errorMessage(err)))
            .finally(() => setIsLoading(false))
    }, [])

    // As leituras chegam fora de ordem; o gráfico precisa delas em ordem de tempo.
    const chartData = useMemo(
        () =>
            [...readings]
                .sort((a, b) => a.measured_at.localeCompare(b.measured_at))
                .map((reading) => ({
                    label: new Date(reading.measured_at).toLocaleString('pt-BR', {
                        timeZone: 'America/Recife',
                        day: '2-digit',
                        month: '2-digit',
                        hour: '2-digit',
                        minute: '2-digit',
                    }),
                    consumption: Number(reading.consumption),
                })),
        [readings],
    )

    const firstName = user?.name.split(' ')[0] ?? ''

    return (
        <div className="resident-page">
            <header className="resident-heading">
                <div>
                    <span className="resident-eyebrow">ÁREA DO MORADOR / VISÃO GERAL</span>
                    <h1>Olá, {firstName}</h1>
                    <p>Acompanhe seu consumo de água e as informações da sua unidade.</p>
                </div>
            </header>

            {isLoading ? (
                <p>Carregando dados...</p>
            ) : loadError ? (
                <p role="alert">{loadError}</p>
            ) : (
                <>
                    <section className="resident-indicators">
                        <article className="resident-card">
                            <span className="resident-card__label">Imóveis monitorados</span>
                            <div className="resident-card__value">
                                <strong>{dashboard?.properties ?? 0}</strong>
                            </div>
                            <span className="resident-card__detail">Imóveis vinculados à sua conta</span>
                        </article>

                        <article className="resident-card">
                            <span className="resident-card__label">Dispositivos</span>
                            <div className="resident-card__value">
                                <strong>{dashboard?.devices ?? 0}</strong>
                            </div>
                            <span className="resident-card__detail">Hidrômetros com leituras</span>
                        </article>

                        <article className="resident-card">
                            <span className="resident-card__label">Consumo hoje</span>
                            <div className="resident-card__value">
                                <strong>{Number(dashboard?.consumption_today ?? 0).toFixed(2)}</strong>
                                <span>m³</span>
                            </div>
                            <span className="resident-card__detail">Soma das leituras de hoje</span>
                        </article>

                        <article className="resident-card">
                            <span className="resident-card__label">Última leitura</span>
                            <div className="resident-card__value">
                                <strong>{formatDateTime(dashboard?.last_reading_at ?? null)}</strong>
                            </div>
                            <span className="resident-card__detail">Horário da leitura mais recente</span>
                        </article>
                    </section>

                    <section className="resident-content-grid">
                        <article className="resident-panel resident-consumption">
                            <div className="resident-panel__header">
                                <div>
                                    <h2>Histórico de consumo</h2>
                                    <p>Consumo registrado em cada leitura.</p>
                                </div>
                                <span className="resident-panel__unit">m³</span>
                            </div>

                            {chartData.length === 0 ? (
                                <p>Nenhuma leitura registrada ainda.</p>
                            ) : (
                                <div className="resident-chart">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <LineChart
                                            data={chartData}
                                            margin={{ top: 15, right: 12, bottom: 5, left: -15 }}
                                        >
                                            <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />

                                            <XAxis
                                                dataKey="label"
                                                tick={{ fill: 'var(--color-text-secondary)', fontSize: 11 }}
                                                axisLine={{ stroke: 'var(--color-border)' }}
                                                tickLine={false}
                                            />

                                            <YAxis
                                                tick={{ fill: 'var(--color-text-secondary)', fontSize: 11 }}
                                                axisLine={false}
                                                tickLine={false}
                                            />

                                            <Tooltip
                                                formatter={(value) => [
                                                    `${Number(value).toFixed(2)} m³`,
                                                    'Consumo',
                                                ]}
                                                contentStyle={{
                                                    backgroundColor: 'var(--color-background)',
                                                    border: '1px solid var(--color-border)',
                                                    borderRadius: '8px',
                                                    color: 'var(--color-text)',
                                                }}
                                            />

                                            <Line
                                                type="monotone"
                                                dataKey="consumption"
                                                name="Consumo"
                                                stroke="#087EBA"
                                                strokeWidth={2.5}
                                                dot={{ r: 3, fill: '#087EBA' }}
                                                activeDot={{ r: 5 }}
                                            />
                                        </LineChart>
                                    </ResponsiveContainer>
                                </div>
                            )}
                        </article>

                        <article className="resident-panel resident-supply">
                            <div className="resident-panel__header">
                                <div>
                                    <h2>Monitoramento</h2>
                                    <p>Situação dos seus hidrômetros.</p>
                                </div>
                            </div>

                            <div className="resident-supply__status">
                                <span className="resident-supply__indicator" />
                                <div>
                                    <strong>
                                        {(dashboard?.devices ?? 0) > 0
                                            ? 'Monitoramento ativo'
                                            : 'Sem dispositivos vinculados'}
                                    </strong>
                                    <p>Última leitura: {formatDateTime(dashboard?.last_reading_at ?? null)}</p>
                                </div>
                            </div>
                        </article>
                    </section>

                    <section className="resident-content-grid">
                        <article className="resident-panel">
                            <div className="resident-panel__header">
                                <div>
                                    <h2>Comunicados recentes</h2>
                                    <p>Informações importantes sobre o abastecimento.</p>
                                </div>
                            </div>

                            <div className="resident-list">
                                {residentNotices.map((notice) => (
                                    <div className="resident-notice" key={notice.id}>
                                        <span className={`resident-notice__indicator resident-notice__indicator--${notice.type}`} />

                                        <div className="resident-list__content">
                                            <strong>{notice.title}</strong>
                                            <p>{notice.description}</p>
                                            <span>{notice.date}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </article>

                        <article className="resident-panel">
                            <div className="resident-panel__header">
                                <div>
                                    <h2>Minhas solicitações</h2>
                                    <p>Acompanhe os atendimentos registrados.</p>
                                </div>
                            </div>

                            <div className="resident-list">
                                {requests.length === 0 ? (
                                    <p>Nenhuma solicitação registrada.</p>
                                ) : (
                                    requests.slice(0, 5).map((request) => (
                                        <div className="resident-request" key={request.id}>
                                            <div className="resident-list__content">
                                                <strong>{residentRequestCategoryLabel[request.category]}</strong>
                                                <span>
                                                    #{request.id} · {formatDateTime(request.created_at)}
                                                </span>
                                            </div>

                                            <span
                                                className={`resident-request__status resident-request__status--${request.status.replaceAll('_', '-')}`}
                                            >
                                                {residentRequestStatusLabel[request.status]}
                                            </span>
                                        </div>
                                    ))
                                )}
                            </div>
                        </article>
                    </section>
                </>
            )}
        </div>
    )
}

export default ResidentOverviewPage