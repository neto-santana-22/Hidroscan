
import {
    CartesianGrid,
    Legend,
    Line,
    LineChart,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from 'recharts'

import {
    monitoringIndicators,
    monitoringReadings,
} from '../data/MonitoringData'

import './MonitoringPage.css'

function MonitoringPage() {
    return (
        <div className="monitoring-page">
            <header className="monitoring-heading">
                <div>
                    <span className="monitoring-eyebrow">
                        VISÃO GERAL / MONITORAMENTO
                    </span>

                    <h1>Monitoramento</h1>

                    <p>
                        Acompanhe os indicadores operacionais da rede de distribuição.
                    </p>
                </div>

                <span className="monitoring-demo">
                    Dados simulados
                </span>
            </header>

            <section className="monitoring-indicators">
                {monitoringIndicators.map((indicator) => (
                    <article
                        className="indicator-card"
                        key={indicator.title}
                    >
                        <span className="indicator-title">
                            {indicator.title}
                        </span>

                        <div className="indicator-value">
                            <strong>{indicator.value}</strong>
                            <span>{indicator.unit}</span>
                        </div>

                        <span
                            className={`indicator-status indicator-status--${indicator.type}`}
                        >
                            {indicator.status}
                        </span>
                    </article>
                ))}
            </section>

            <section className="monitoring-section">
                <div className="monitoring-section__header">
                    <div>
                        <h2>Comportamento da rede</h2>
                        <p>
                            Histórico de vazão e pressão nas últimas 24 horas.
                        </p>
                    </div>
                </div>

                <div className="monitoring-chart">
                    <ResponsiveContainer width="100%" height="100%">
                        <LineChart
                            data={monitoringReadings}
                            margin={{
                                top: 20,
                                right: 20,
                                bottom: 10,
                                left: 10,
                            }}
                        >
                            <CartesianGrid
                                strokeDasharray="3 3"
                                stroke="var(--color-border)"
                            />

                            <XAxis
                                dataKey="time"
                                tick={{ fill: 'var(--color-text-secondary)', fontSize: 12 }}
                                axisLine={{ stroke: 'var(--color-border)' }}
                                tickLine={false}
                            />

                            <YAxis
                                yAxisId="flow"
                                orientation="left"
                                tick={{ fill: 'var(--color-text-secondary)', fontSize: 12 }}
                                axisLine={false}
                                tickLine={false}
                                label={{
                                    value: 'Vazão (m³/h)',
                                    angle: -90,
                                    position: 'insideLeft',
                                    fill: 'var(--color-text-secondary)',
                                    fontSize: 12,
                                }}
                            />

                            <YAxis
                                yAxisId="pressure"
                                orientation="right"
                                tick={{ fill: 'var(--color-text-secondary)', fontSize: 12 }}
                                axisLine={false}
                                tickLine={false}
                                label={{
                                    value: 'Pressão (mca)',
                                    angle: 90,
                                    position: 'insideRight',
                                    fill: 'var(--color-text-secondary)',
                                    fontSize: 12,
                                }}
                            />

                            <Tooltip
                                contentStyle={{
                                    backgroundColor: 'var(--color-background)',
                                    border: '1px solid var(--color-border)',
                                    borderRadius: '8px',
                                    color: 'var(--color-text)',
                                }}
                                labelStyle={{
                                    color: 'var(--color-text)',
                                    fontWeight: 600,
                                }}
                            />

                            <Legend />

                            <Line
                                yAxisId="flow"
                                type="monotone"
                                dataKey="flow"
                                name="Vazão (m³/h)"
                                stroke="#087EBA"
                                strokeWidth={2.5}
                                dot={false}
                                activeDot={{ r: 5 }}
                            />

                            <Line
                                yAxisId="pressure"
                                type="monotone"
                                dataKey="pressure"
                                name="Pressão (mca)"
                                stroke="#20A6D2"
                                strokeWidth={2.5}
                                dot={false}
                                activeDot={{ r: 5 }}
                            />
                        </LineChart>
                    </ResponsiveContainer>
                </div>
            </section>
        </div>
    )
}

export default MonitoringPage
