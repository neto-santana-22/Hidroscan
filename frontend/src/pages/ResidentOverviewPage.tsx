
import {
    CartesianGrid,
    Line,
    LineChart,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from 'recharts'

import {
    residentConsumption,
    residentNotices,
    residentRequests,
    residentSummary,
} from '../data/ResidentData'

import './ResidentOverviewPage.css'

function ResidentOverviewPage() {
    return (
        <div className="resident-page">
            <header className="resident-heading">
                <div>
                    <span className="resident-eyebrow">
                        ÁREA DO MORADOR / VISÃO GERAL
                    </span>

                    <h1>Olá, {residentSummary.consumerName.split(' ')[0]}</h1>

                    <p>
                        Acompanhe seu consumo de água e as informações da sua unidade.
                    </p>

                    <span className="resident-unit">
                        {residentSummary.unit}
                    </span>
                </div>

                <span className="resident-demo">Dados simulados</span>
            </header>

            <section className="resident-indicators">
                <article className="resident-card">
                    <span className="resident-card__label">
                        Consumo no mês
                    </span>

                    <div className="resident-card__value">
                        <strong>{residentSummary.currentConsumption}</strong>
                        <span>{residentSummary.consumptionUnit}</span>
                    </div>

                    <span className="resident-card__detail">
                        Leitura atualizada em {residentSummary.lastReading}
                    </span>
                </article>

                <article className="resident-card">
                    <span className="resident-card__label">
                        Média diária
                    </span>

                    <div className="resident-card__value">
                        <strong>{residentSummary.dailyAverage}</strong>
                        <span>m³/dia</span>
                    </div>

                    <span className="resident-card__detail">
                        Média de consumo diário
                    </span>
                </article>

                <article className="resident-card">
                    <span className="resident-card__label">
                        Mês anterior
                    </span>

                    <div className="resident-card__value">
                        <strong>{residentSummary.previousConsumption}</strong>
                        <span>m³</span>
                    </div>

                    <span className="resident-card__detail">
                        Consumo do período anterior
                    </span>
                </article>

                <article className="resident-card">
                    <span className="resident-card__label">
                        Comparativo
                    </span>

                    <div className="resident-card__comparison">
                        <strong>↓ 12,7%</strong>
                    </div>

                    <span className="resident-card__detail">
                        {residentSummary.comparison}
                    </span>
                </article>
            </section>

            <section className="resident-content-grid">
                <article className="resident-panel resident-consumption">
                    <div className="resident-panel__header">
                        <div>
                            <h2>Histórico de consumo</h2>
                            <p>Consumo diário registrado durante outubro.</p>
                        </div>

                        <span className="resident-panel__unit">
                            m³/dia
                        </span>
                    </div>

                    <div className="resident-chart">
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart
                                data={residentConsumption}
                                margin={{
                                    top: 15,
                                    right: 12,
                                    bottom: 5,
                                    left: -15,
                                }}
                            >
                                <CartesianGrid
                                    strokeDasharray="3 3"
                                    stroke="var(--color-border)"
                                />

                                <XAxis
                                    dataKey="day"
                                    tick={{
                                        fill: 'var(--color-text-secondary)',
                                        fontSize: 11,
                                    }}
                                    axisLine={{ stroke: 'var(--color-border)' }}
                                    tickLine={false}
                                />

                                <YAxis
                                    tick={{
                                        fill: 'var(--color-text-secondary)',
                                        fontSize: 11,
                                    }}
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
                </article>

                <article className="resident-panel resident-supply">
                    <div className="resident-panel__header">
                        <div>
                            <h2>Situação do abastecimento</h2>
                            <p>Condição atual do fornecimento.</p>
                        </div>
                    </div>

                    <div className="resident-supply__status">
                        <span className="resident-supply__indicator" />

                        <div>
                            <strong>{residentSummary.supplyStatus}</strong>
                            <p>Sem interrupções informadas.</p>
                        </div>
                    </div>

                    <div className="resident-supply__footer">
                        <span>Unidade consumidora</span>
                        <strong>001245</strong>
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
                                <span
                                    className={`resident-notice__indicator resident-notice__indicator--${notice.type}`}
                                />

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
                        {residentRequests.map((request) => (
                            <div className="resident-request" key={request.id}>
                                <div className="resident-list__content">
                                    <strong>{request.title}</strong>
                                    <span>
                                        {request.id} · {request.date}
                                    </span>
                                </div>

                                <span
                                    className={`resident-request__status resident-request__status--${request.status
                                        .toLowerCase()
                                        .replace(' ', '-')}`}
                                >
                                    {request.status}
                                </span>
                            </div>
                        ))}
                    </div>
                </article>
            </section>

            <p className="resident-disclaimer">
                Os dados apresentados são fictícios e utilizados exclusivamente
                para demonstração da plataforma.
            </p>
        </div>
    )
}

export default ResidentOverviewPage
