import { useEffect, useMemo, useState } from 'react'

import { apiFetch } from '../api/client'
import { formatDateTime, type Paginated } from '../api/types'

import './TechnicianEquipmentPage.css'

// Formato do dispositivo que a API devolve em /api/dispositivos/.
interface Device {
    id: number
    property: number
    name: string
    serial_number: string
    valve_state: 'open' | 'closed' | 'unknown'
    last_reading_at: string | null
    active: boolean
}

// Rótulos da válvula em português.
const valveLabel: Record<Device['valve_state'], string> = {
    open: 'Aberta',
    closed: 'Fechada',
    unknown: 'Desconhecida',
}

// O backend não tem "Atenção"; o status é derivado de dispositivo ativo ou não.
type StatusFilter = 'Todos' | 'Operacional' | 'Offline'

function deviceStatus(device: Device): 'Operacional' | 'Offline' {
    return device.active ? 'Operacional' : 'Offline'
}

function errorMessage(err: unknown) {
    return err instanceof Error ? err.message : 'Erro inesperado.'
}

function TechnicianEquipmentPage() {
    const [devices, setDevices] = useState<Device[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [loadError, setLoadError] = useState('')
    const [filter, setFilter] = useState<StatusFilter>('Todos')
    const [search, setSearch] = useState('')

    // Carrega os dispositivos dos imóveis que o técnico pode ver.
    useEffect(() => {
        apiFetch<Paginated<Device>>('/api/dispositivos/')
            .then((data) => setDevices(data.results))
            .catch((err) => setLoadError(errorMessage(err)))
            .finally(() => setIsLoading(false))
    }, [])

    // Aplica o filtro de status e a busca por nome ou número de série.
    const filteredDevices = useMemo(() => {
        const term = search.trim().toLowerCase()

        return devices.filter((device) => {
            const matchesStatus = filter === 'Todos' || deviceStatus(device) === filter
            const matchesSearch = [device.name, device.serial_number].some((value) =>
                value.toLowerCase().includes(term),
            )
            return matchesStatus && matchesSearch
        })
    }, [devices, filter, search])

    // Números dos cards de resumo.
    const counts = {
        total: devices.length,
        operational: devices.filter((device) => deviceStatus(device) === 'Operacional').length,
        offline: devices.filter((device) => deviceStatus(device) === 'Offline').length,
    }

    return (
        <section className="technician-equipment">
            <header className="technician-heading">
                <div>
                    <span className="technician-eyebrow">ÁREA TÉCNICA</span>
                    <h1>Equipamentos</h1>
                    <p>Consulte os dispositivos e acompanhe suas condições operacionais.</p>
                </div>
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
                    <span>Offline</span>
                    <strong>{counts.offline}</strong>
                </article>
            </div>

            <div className="technician-equipment-toolbar">
                <input
                    type="search"
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Buscar por nome ou número de série..."
                    aria-label="Buscar equipamentos"
                />

                <select
                    value={filter}
                    onChange={(event) => setFilter(event.target.value as StatusFilter)}
                    aria-label="Filtrar equipamentos por status"
                >
                    <option value="Todos">Todos os status</option>
                    <option value="Operacional">Operacional</option>
                    <option value="Offline">Offline</option>
                </select>
            </div>

            <div className="technician-equipment-list">
                {isLoading ? (
                    <div className="technician-empty">Carregando equipamentos...</div>
                ) : loadError ? (
                    <div className="technician-empty" role="alert">{loadError}</div>
                ) : filteredDevices.length === 0 ? (
                    <div className="technician-empty">Nenhum equipamento encontrado.</div>
                ) : (
                    filteredDevices.map((device) => {
                        const status = deviceStatus(device)

                        return (
                            <article className="technician-equipment-card" key={device.id}>
                                <div className="technician-equipment-card__header">
                                    <div>
                                        <span className="technician-order-id">{device.serial_number}</span>
                                        <h2>{device.name}</h2>
                                    </div>

                                    <span
                                        className={`technician-equipment-status technician-equipment-status--${status.toLowerCase()}`}
                                    >
                                        {status}
                                    </span>
                                </div>

                                <div className="technician-equipment-details">
                                    <div>
                                        <span>Imóvel</span>
                                        <strong>#{device.property}</strong>
                                    </div>
                                    <div>
                                        <span>Válvula</span>
                                        <strong>{valveLabel[device.valve_state]}</strong>
                                    </div>
                                    <div>
                                        <span>Última comunicação</span>
                                        <strong>{formatDateTime(device.last_reading_at)}</strong>
                                    </div>
                                </div>
                            </article>
                        )
                    })
                )}
            </div>
        </section>
    )
}

export default TechnicianEquipmentPage