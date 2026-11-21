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
import { formatDateTime, type Paginated, type Property } from '../api/types'

import './ResidentConsumptionPage.css'

// Uma leitura de /api/imoveis/{id}/leituras/.
interface Reading {
    id: number
    device: number
    measured_at: string
    volume: string | number
    consumption: string | number
}

function errorMessage(err: unknown) {
    return err instanceof Error ? err.message : 'Erro inesperado.'
}

// Formata um número com vírgula decimal, como no padrão brasileiro.
function formatM3(value: number) {
    return `${value.toFixed(2).replace('.', ',')} m³`
}

function ResidentConsumptionPage() {
    const [readings, setReadings] = useState<Reading[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [loadError, setLoadError] = useState('')

    // Busca as leituras do primeiro imóvel do morador quando a tela abre.
    useEffect(() => {
        apiFetch<Paginated<Property>>('/api/imoveis/')
            .then(async (propertyData) => {
                if (propertyData.results.length === 0) return
                const propertyId = propertyData.results[0].id
                const readingData = await apiFetch<Reading[]>(
                    `/api/imoveis/${propertyId}/leituras/?limite=500`,
                )
                setReadings(readingData)
            })
            .catch((err) => setLoadError(errorMessage(err)))
            .finally(() => setIsLoading(false))
    }, [])

    // Leituras em ordem de tempo, para o gráfico e a média.
    const sortedReadings = useMemo(
        () => [...readings].sort((a, b) => a.measured_at.localeCompare(b.measured_at)),
        [readings],
    )

    // Soma de todo o consumo registrado.
    const total = sortedReadings.reduce((sum, reading) => sum + Number(reading.consumption), 0)

    // Média por dia: total dividido pela quantidade de dias diferentes com leitura.
    const distinctDays = new Set(
        sortedReadings.map((reading) =>
            new Date(reading.measured_at).toLocaleDateString('pt-BR', { timeZone: 'America/Recife' }),
        ),
    ).size
    const dailyAverage = distinctDays > 0 ? total / distinctDays : 0

    const chartData = sortedReadings.map((reading) => ({
        label: new Date(reading.measured_at).toLocaleString('pt-BR', {
            timeZone: 'America/Recife',
            day: '2-digit',
            month: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
        }),
        consumption: Number(reading.consumption),
    }))

    const lastReading = sortedReadings[sortedReadings.length - 1]?.measured_at ?? null

    return (
        <div className="consumption-page">
            <header className="consumption-heading">
                <div>
                    <span className="consumption-eyebrow">ÁREA DO MORADOR / MEU CONSUMO</span>
                    <h1>Meu consumo</h1>
                    <p>Acompanhe suas leituras e entenda como está seu consumo de água.</p>
                </div>
            </header>

            {isLoading ? (
                <p>Carregando consumo...</p>
            ) : loadError ? (
                <p role="alert">{loadError}</p>
            ) : (
                <>
                    <section className="consumption-indicators">
                        <article className="consumption-card">
                            <span>Consumo registrado</span>
                            <strong>{formatM3(total)}</strong>
                            <small>Soma de todas as leituras</small>
                        </article>

                        <article className="consumption-card">
                            <span>Média diária</span>
                            <strong>{formatM3(dailyAverage)}</strong>
                            <small>Consumo médio por dia</small>
                        </article>

                        <article className="consumption-card">
                            <span>Leituras</span>
                            <strong>{sortedReadings.length}</strong>
                            <small>Registros disponíveis</small>
                        </article>

                        <article className="consumption-card">
                            <span>Última leitura</span>
                            <strong>{formatDateTime(lastReading)}</strong>
                            <small>Registro mais recente</small>
                        </article>
                    </section>

                    <section className="consumption-panel">
                        <div className="consumption-panel__header">
                            <div>
                                <h2>Evolução do consumo</h2>
                                <p>Consumo registrado em cada leitura.</p>
                            </div>
                        </div>

                        {chartData.length === 0 ? (
                            <p>Nenhuma leitura registrada ainda.</p>
                        ) : (
                            <div className="consumption-chart">
                                <ResponsiveContainer width="100%" height="100%">
                                    <LineChart
                                        data={chartData}
                                        margin={{ top: 15, right: 15, bottom: 5, left: -15 }}
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
                                            dot={{ r: 4, fill: '#087EBA' }}
                                            activeDot={{ r: 6 }}
                                        />
                                    </LineChart>
                                </ResponsiveContainer>
                            </div>
                        )}
                    </section>
                </>
            )}
        </div>
    )
}

export default ResidentConsumptionPage