import { useState } from 'react'

import { residentNotices } from '../data/ResidentData'
import './ResidentNoticesPage.css'

type NoticeFilter = 'Todos' | 'Informações' | 'Alertas' | 'Concluídos'

const filterByType: Record<NoticeFilter, string[]> = {
    Todos: ['info', 'warning', 'success'],
    Informações: ['info'],
    Alertas: ['warning'],
    Concluídos: ['success'],
}

const typeLabels = {
    info: 'Informação',
    warning: 'Alerta',
    success: 'Normalização',
}

function ResidentNoticesPage() {
    const [filter, setFilter] = useState<NoticeFilter>('Todos')

    const filteredNotices = residentNotices.filter((notice) =>
        filterByType[filter].includes(notice.type),
    )

    return (
        <div className="resident-notices">
            <header className="resident-notices__heading">
                <div>
                    <span className="resident-notices__eyebrow">
                        ÁREA DO MORADOR / COMUNICADOS
                    </span>
                    <h1>Comunicados</h1>
                    <p>Fique informado sobre o abastecimento e avisos do sistema.</p>
                </div>

                <span className="resident-notices__demo">Dados simulados</span>
            </header>

            <section className="resident-notices__panel">
                <div className="resident-notices__toolbar">
                    <div>
                        <h2>Comunicados recebidos</h2>
                        <p>{filteredNotices.length} comunicado(s) encontrado(s).</p>
                    </div>

                    <div className="resident-notices__filters">
                        {(
                            ['Todos', 'Informações', 'Alertas', 'Concluídos'] as NoticeFilter[]
                        ).map((item) => (
                            <button
                                key={item}
                                type="button"
                                className={filter === item ? 'active' : ''}
                                onClick={() => setFilter(item)}
                            >
                                {item}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="resident-notices__list">
                    {filteredNotices.length > 0 ? (
                        filteredNotices.map((notice) => (
                            <article className="resident-notice-item" key={notice.id}>
                                <span
                                    className={`resident-notice-item__indicator resident-notice-item__indicator--${notice.type}`}
                                />

                                <div className="resident-notice-item__content">
                                    <div className="resident-notice-item__title">
                                        <h3>{notice.title}</h3>
                                        <span
                                            className={`resident-notice-item__type resident-notice-item__type--${notice.type}`}
                                        >
                                            {typeLabels[notice.type]}
                                        </span>
                                    </div>

                                    <p>{notice.description}</p>
                                    <time>{notice.date}</time>
                                </div>
                            </article>
                        ))
                    ) : (
                        <p className="resident-notices__empty">
                            Nenhum comunicado encontrado nesta categoria.
                        </p>
                    )}
                </div>
            </section>

            <p className="resident-notices__disclaimer">
                Os comunicados exibidos são fictícios e utilizados para demonstração.
            </p>
        </div>
    )
}

export default ResidentNoticesPage