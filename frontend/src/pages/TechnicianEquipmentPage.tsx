
import { useMemo, useState } from 'react'
import { technicalEquipments } from '../data/TechnicianData'

import './TechnicianEquipmentPage.css'

type EquipmentFilter = 'Todos' | 'Operacional' | 'Atenção' | 'Offline'

function TechnicianEquipmentPage() {
    const [filter, setFilter] = useState<EquipmentFilter>('Todos')
    const [search, setSearch] = useState('')

    const filteredEquipments = useMemo(() => {
        const normalizedSearch = search.trim().toLowerCase()

        return technicalEquipments.filter((equipment) => {
            const matchesStatus =
                filter === 'Todos' || equipment.status === filter

            const matchesSearch = [
                equipment.id,
                equipment.name,
                equipment.type,
                equipment.location,
            ].some((value) => value.toLowerCase().includes(normalizedSearch))

            return matchesStatus && matchesSearch
        })
    }, [filter, search])

    const counts = {
        total: technicalEquipments.length,
        operational: technicalEquipments.filter(
            (item) => item.status === 'Operacional',
        ).length,
        attention: technicalEquipments.filter(
            (item) => item.status === 'Atenção',
        ).length,
        offline: technicalEquipments.filter(
            (item) => item.status === 'Offline',
        ).length,
    }

    return (
        <section className="technician-equipment">
            <header className="technician-heading">
                <div>
                    <span className="technician-eyebrow">ÁREA TÉCNICA</span>
                    <h1>Equipamentos</h1>
                    <p>Consulte os dispositivos e acompanhe suas condições operacionais.</p>
                </div>

                <span className="technician-data-label">Dados simulados</span>
            </header>

            <div className="technician-equipment-summary">
                <article>
                    <span>Total de equipamentos</span>
                    <strong>{counts.total}</strong>
                </article>
                <article>
                    <span>Operacionais</span>
                    <strong>{counts.operational}</strong>
                </article>
                <article>
                    <span>Em atenção</span>
                    <strong>{counts.attention}</strong>
                </article>
                <article>
                    <span>Offline</span>
                    <strong>{counts.offline}</strong>
                </article>
            </div>

            <div className="technician-equipment-toolbar">
                <input
                    type="search"
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Buscar por código, tipo ou localização..."
                    aria-label="Buscar equipamentos"
                />

                <select
                    value={filter}
                    onChange={(event) =>
                        setFilter(event.target.value as EquipmentFilter)
                    }
                    aria-label="Filtrar equipamentos por status"
                >
                    <option value="Todos">Todos os status</option>
                    <option value="Operacional">Operacional</option>
                    <option value="Atenção">Atenção</option>
                    <option value="Offline">Offline</option>
                </select>
            </div>

            <div className="technician-equipment-list">
                {filteredEquipments.length === 0 ? (
                    <div className="technician-empty">
                        Nenhum equipamento encontrado.
                    </div>
                ) : (
                    filteredEquipments.map((equipment) => (
                        <article
                            className="technician-equipment-card"
                            key={equipment.id}
                        >
                            <div className="technician-equipment-card__header">
                                <div>
                                    <span className="technician-order-id">
                                        {equipment.id}
                                    </span>
                                    <h2>{equipment.name}</h2>
                                    <p>{equipment.type}</p>
                                </div>

                                <span
                                    className={`technician-equipment-status technician-equipment-status--${equipment.status.toLowerCase()}`}
                                >
                                    {equipment.status}
                                </span>
                            </div>

                            <div className="technician-equipment-details">
                                <div>
                                    <span>Localização</span>
                                    <strong>{equipment.location}</strong>
                                </div>
                                <div>
                                    <span>Última manutenção</span>
                                    <strong>{equipment.lastMaintenance}</strong>
                                </div>
                                <div>
                                    <span>Última comunicação</span>
                                    <strong>{equipment.lastCommunication}</strong>
                                </div>
                                <div>
                                    <span>Bateria</span>
                                    <strong>{equipment.battery}%</strong>
                                </div>
                            </div>

                            <div className="technician-battery">
                                <div
                                    className="technician-battery__fill"
                                    style={{ width: `${equipment.battery}%` }}
                                />
                            </div>
                        </article>
                    ))
                )}
            </div>
        </section>
    )
}

export default TechnicianEquipmentPage
