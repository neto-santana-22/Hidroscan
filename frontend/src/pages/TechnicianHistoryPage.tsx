
import { useMemo, useState } from 'react'
import { technicalInterventions } from '../data/TechnicianData'

import './TechnicianHistoryPage.css'

type InterventionFilter =
    | 'Todas'
    | 'Inspeção'
    | 'Manutenção preventiva'
    | 'Manutenção corretiva'

function TechnicianHistoryPage() {
    const [filter, setFilter] = useState<InterventionFilter>('Todas')
    const [search, setSearch] = useState('')

    const filteredInterventions = useMemo(() => {
        const term = search.trim().toLowerCase()

        return technicalInterventions.filter((item) => {
            const matchesType = filter === 'Todas' || item.type === filter

            const matchesSearch = [
                item.id,
                item.title,
                item.equipment,
                item.location,
            ].some((value) => value.toLowerCase().includes(term))

            return matchesType && matchesSearch
        })
    }, [filter, search])

    const preventive = technicalInterventions.filter(
        (item) => item.type === 'Manutenção preventiva',
    ).length

    const corrective = technicalInterventions.filter(
        (item) => item.type === 'Manutenção corretiva',
    ).length

    const inspections = technicalInterventions.filter(
        (item) => item.type === 'Inspeção',
    ).length

    return (
        <section className="technician-history">
            <header className="technician-heading">
                <div>
                    <span className="technician-eyebrow">ÁREA TÉCNICA</span>
                    <h1>Histórico técnico</h1>
                    <p>Consulte as intervenções e manutenções realizadas.</p>
                </div>
                <span className="technician-data-label">Dados simulados</span>
            </header>

            <div className="technician-history-summary">
                <article>
                    <span>Total de intervenções</span>
                    <strong>{technicalInterventions.length}</strong>
                </article>
                <article>
                    <span>Preventivas</span>
                    <strong>{preventive}</strong>
                </article>
                <article>
                    <span>Corretivas</span>
                    <strong>{corrective}</strong>
                </article>
                <article>
                    <span>Inspeções</span>
                    <strong>{inspections}</strong>
                </article>
            </div>

            <div className="technician-history-toolbar">
                <input
                    type="search"
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Buscar por ordem, equipamento ou local..."
                    aria-label="Buscar no histórico técnico"
                />

                <select
                    value={filter}
                    onChange={(event) =>
                        setFilter(event.target.value as InterventionFilter)
                    }
                    aria-label="Filtrar tipo de intervenção"
                >
                    <option value="Todas">Todos os tipos</option>
                    <option value="Inspeção">Inspeções</option>
                    <option value="Manutenção preventiva">Preventivas</option>
                    <option value="Manutenção corretiva">Corretivas</option>
                </select>
            </div>

            <div className="technician-history-list">
                {filteredInterventions.length === 0 ? (
                    <div className="technician-empty">
                        Nenhuma intervenção encontrada.
                    </div>
                ) : (
                    filteredInterventions.map((item) => (
                        <article className="technician-history-card" key={item.id}>
                            <div className="technician-history-card__header">
                                <div>
                                    <span className="technician-order-id">{item.id}</span>
                                    <h2>{item.title}</h2>
                                </div>
                                <span className="technician-history-type">{item.type}</span>
                            </div>

                            <div className="technician-history-details">
                                <div>
                                    <span>Equipamento</span>
                                    <strong>{item.equipment}</strong>
                                </div>
                                <div>
                                    <span>Localização</span>
                                    <strong>{item.location}</strong>
                                </div>
                                <div>
                                    <span>Responsável</span>
                                    <strong>{item.technician}</strong>
                                </div>
                                <div>
                                    <span>Data</span>
                                    <strong>{item.date}</strong>
                                </div>
                            </div>

                            <div className="technician-history-result">
                                <span>Resultado da intervenção</span>
                                <p>{item.result}</p>
                            </div>
                        </article>
                    ))
                )}
            </div>
        </section>
    )
}

export default TechnicianHistoryPage
