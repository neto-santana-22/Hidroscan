import { useEffect, useMemo, useState } from 'react'

import { apiFetch } from '../api/client'
import { formatDateTime, type Paginated, type Property } from '../api/types'

import './ResidentHistoryPage.css'

// Uma leitura de /api/imoveis/{id}/leituras/.
interface Reading {
    id: number
    device: number
    external_id: string
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

function ResidentHistoryPage() {
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

    // A tabela mostra a leitura mais recente primeiro.
    const sortedReadings = useMemo(
        () => [...readings].sort((a, b) => b.measured_at.localeCompare(a.measured_at)),
        [readings],
    )

    const totalConsumption = sortedReadings.reduce(
        (sum, reading) => sum + Number(reading.consumption),
        0,
    )

    const lastReading = sortedReadings[0]?.measured_at ?? null

    return (
        <div className="resident-history">
            <header className="resident-history__heading">
                <div>
                    <span className="resident-history__eyebrow">ÁREA DO MORADOR / HISTÓRICO</span>
                    <h1>Histórico de consumo</h1>
                    <p>Consulte as leituras e o consumo registrado na sua unidade.</p>
                </div>
            </header>

            {isLoading ? (
                <p>Carregando histórico...</p>
            ) : loadError ? (
                <p role="alert">{loadError}</p>
            ) : (
                <>
                    <section className="resident-history__summary">
                        <article>
                            <span>Registros disponíveis</span>
                            <strong>{sortedReadings.length}</strong>
                            <small>Leituras registradas</small>
                        </article>

                        <article>
                            <span>Consumo acumulado</span>
                            <strong>{formatM3(totalConsumption)}</strong>
                            <small>Soma de todas as leituras</small>
                        </article>

                        <article>
                            <span>Última leitura</span>
                            <strong>{formatDateTime(lastReading)}</strong>
                            <small>Registro mais recente</small>
                        </article>
                    </section>

                    <section className="resident-history__panel">
                        <div className="resident-history__panel-heading">
                            <div>
                                <h2>Leituras registradas</h2>
                                <p>Histórico de consumo da unidade consumidora.</p>
                            </div>
                        </div>

                        {sortedReadings.length === 0 ? (
                            <p>Nenhuma leitura registrada ainda.</p>
                        ) : (
                            <div className="resident-history__table-wrapper">
                                <table className="resident-history__table">
                                    <thead>
                                        <tr>
                                            <th>Data</th>
                                            <th>Leitura do hidrômetro</th>
                                            <th>Consumo do período</th>
                                            <th>Dispositivo</th>
                                        </tr>
                                    </thead>

                                    <tbody>
                                        {sortedReadings.map((reading) => (
                                            <tr key={reading.id}>
                                                <td>{formatDateTime(reading.measured_at)}</td>
                                                <td>{formatM3(Number(reading.volume))}</td>
                                                <td>{formatM3(Number(reading.consumption))}</td>
                                                <td>#{reading.device}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </section>
                </>
            )}
        </div>
    )
}

export default ResidentHistoryPage