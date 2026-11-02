import { useState } from 'react'

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
    consumptionHistory,
    consumptionSummary,
    dailyConsumption,
} from '../data/ResidentConsumptionData'

import './ResidentConsumptionPage.css'

type Period = '30days' | '6months'

function ResidentConsumptionPage() {
    const [period, setPeriod] = useState<Period>('30days')

    const chartData =
        period === '30days'
            ? dailyConsumption.map((item) => ({
                label: item.label,
                consumption: item.consumption,
            }))
            : [...consumptionHistory]
                .reverse()
                .map((item) => ({
                    label: item.date.slice(3, 10),
                    consumption: item.consumption,
                }))

    return (
        <div className="consumption-page">
            <header className="consumption-heading">
                <div>
                    <span className="consumption-eyebrow">
                        ÁREA DO MORADOR / MEU CONSUMO
                    </span>
                    <h1>Meu consumo</h1>
                    <p>
                        Acompanhe suas leituras e entenda como está seu consumo de água.
                    </p>
                </div>

                <span className="consumption-demo">Dados simulados</span>
            </header>

            <section className="consumption-indicators">
                <article className="consumption-card">
                    <span>Consumo atual</span>
                    <strong>{consumptionSummary.total.toFixed(1).replace('.', ',')} m³</strong>
                    <small>Período atual</small>
                </article>

                <article className="consumption-card">
                    <span>Média diária</span>
                    <strong>{consumptionSummary.average.toFixed(2).replace('.', ',')} m³</strong>
                    <small>Consumo médio por dia</small>
                </article>

                <article className="consumption-card">
                    <span>Período anterior</span>
                    <strong>
                        {consumptionSummary.previousPeriod.toFixed(1).replace('.', ',')} m³
                    </strong>
                    <small>Consumo anterior</small>
                </article>

                <article className="consumption-card">
                    <span>Variação</span>
                    <strong className="consumption-card__positive">
                        {consumptionSummary.variation.toString().replace('.', ',')}%
                    </strong>
                    <small>Redução em relação ao período anterior</small>
                </article>
            </section>

            <section className="consumption-panel">
                <div className="consumption-panel__header">
                    <div>
                        <h2>Evolução do consumo</h2>
                        <p>Visualize o consumo registrado ao longo do período.</p>
                    </div>

                    <div className="consumption-filters">
                        <button
                            type="button"
                            className={period === '30days' ? 'active' : ''}
                            onClick={() => setPeriod('30days')}
                        >
                            30 dias
                        </button>

                        <button
                            type="button"
                            className={period === '6months' ? 'active' : ''}
                            onClick={() => setPeriod('6months')}
                        >
                            6 meses
                        </button>
                    </div>
                </div>

                <div className="consumption-chart">
                    <ResponsiveContainer width="100%" height="100%">
                        <LineChart
                            data={chartData}
                            margin={{ top: 15, right: 15, bottom: 5, left: -15 }}
                        >
                            <CartesianGrid
                                strokeDasharray="3 3"
                                stroke="var(--color-border)"
                            />

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
                                dot={{ r: 4, fill: '#087EBA' }}
                                activeDot={{ r: 6 }}
                            />
                        </LineChart>
                    </ResponsiveContainer>
                </div>

                <p className="consumption-chart__note">
                    Valores de demonstração. Os registros não representam medições reais.
                </p>
            </section>

            <section className="consumption-panel">
                <div className="consumption-panel__header">
                    <div>
                        <h2>Histórico de leituras</h2>
                        <p>Consulte as últimas leituras registradas para sua unidade.</p>
                    </div>
                </div>

                <div className="consumption-table-wrapper">
                    <table className="consumption-table">
                        <thead>
                            <tr>
                                <th>Identificação</th>
                                <th>Data</th>
                                <th>Leitura do hidrômetro</th>
                                <th>Consumo</th>
                                <th>Situação</th>
                            </tr>
                        </thead>

                        <tbody>
                            {consumptionHistory.map((reading) => (
                                <tr key={reading.id}>
                                    <td>{reading.id}</td>
                                    <td>{reading.date}</td>
                                    <td>{reading.reading.toFixed(1).replace('.', ',')} m³</td>
                                    <td>{reading.consumption.toFixed(1).replace('.', ',')} m³</td>
                                    <td>
                                        <span
                                            className={`consumption-status consumption-status--${reading.status.toLowerCase()}`}
                                        >
                                            {reading.status}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </section>

            <p className="consumption-disclaimer">
                Os dados apresentados são fictícios e utilizados exclusivamente para
                demonstração da plataforma.
            </p>
        </div>
    )
}

export default ResidentConsumptionPage