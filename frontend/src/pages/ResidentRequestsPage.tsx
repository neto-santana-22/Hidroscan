import { useState, type FormEvent } from 'react'

import {
    residentRequests as initialRequests,
    type ResidentRequest,
} from '../data/ResidentData'

import './ResidentRequestsPage.css'

function ResidentRequestsPage() {
    const [requests, setRequests] = useState<ResidentRequest[]>(initialRequests)
    const [category, setCategory] = useState('Vazamento')
    const [description, setDescription] = useState('')
    const [filter, setFilter] = useState('Todas')
    const [feedback, setFeedback] = useState('')

    function handleSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault()

        const newRequest: ResidentRequest = {
            id: `SOL-${String(Date.now()).slice(-6)}`,
            title: category,
            date: new Date().toLocaleDateString('pt-BR'),
            status: 'Em análise',
        }

        setRequests((previous) => [newRequest, ...previous])
        setDescription('')
        setCategory('Vazamento')
        setFeedback(
            `Solicitação ${newRequest.id} registrada nesta demonstração.`,
        )
    }

    const filteredRequests = requests.filter((request) => {
        return filter === 'Todas' || request.status === filter
    })

    return (
        <div className="resident-requests">
            <header className="resident-requests__heading">
                <div>
                    <span className="resident-requests__eyebrow">
                        ÁREA DO MORADOR / SOLICITAÇÕES
                    </span>
                    <h1>Minhas solicitações</h1>
                    <p>Registre ocorrências e acompanhe seus atendimentos.</p>
                </div>

                <span className="resident-requests__demo">Dados simulados</span>
            </header>

            <section className="resident-requests__panel">
                <div className="resident-requests__panel-heading">
                    <h2>Nova solicitação</h2>
                    <p>Descreva o que está acontecendo para registrar seu pedido.</p>
                </div>

                <form className="resident-request-form" onSubmit={handleSubmit}>
                    <div className="resident-request-form__field">
                        <label htmlFor="request-category">Categoria</label>
                        <select
                            id="request-category"
                            value={category}
                            onChange={(event) => setCategory(event.target.value)}
                        >
                            <option value="Vazamento">Vazamento</option>
                            <option value="Falta de água">Falta de água</option>
                            <option value="Verificação de hidrômetro">
                                Verificação de hidrômetro
                            </option>
                            <option value="Qualidade da água">Qualidade da água</option>
                            <option value="Dúvida sobre consumo">Dúvida sobre consumo</option>
                            <option value="Outro">Outro</option>
                        </select>
                    </div>

                    <div className="resident-request-form__field">
                        <label htmlFor="request-description">Descrição</label>
                        <textarea
                            id="request-description"
                            value={description}
                            onChange={(event) => setDescription(event.target.value)}
                            placeholder="Descreva sua solicitação..."
                            rows={4}
                            minLength={10}
                            maxLength={1000}
                            required
                        />
                    </div>

                    {feedback && (
                        <p className="resident-requests__feedback" role="status">
                            {feedback}
                        </p>
                    )}

                    <button type="submit" className="resident-requests__submit">
                        Registrar solicitação
                    </button>
                </form>
            </section>

            <section className="resident-requests__panel">
                <div className="resident-requests__list-heading">
                    <div>
                        <h2>Solicitações registradas</h2>
                        <p>{filteredRequests.length} registro(s) encontrado(s).</p>
                    </div>

                    <select
                        aria-label="Filtrar solicitações por situação"
                        value={filter}
                        onChange={(event) => setFilter(event.target.value)}
                    >
                        <option value="Todas">Todas</option>
                        <option value="Em análise">Em análise</option>
                        <option value="Em andamento">Em andamento</option>
                        <option value="Concluída">Concluídas</option>
                    </select>
                </div>

                <div className="resident-requests__list">
                    {filteredRequests.length > 0 ? (
                        filteredRequests.map((request) => (
                            <article className="resident-request-item" key={request.id}>
                                <div>
                                    <strong>{request.title}</strong>
                                    <span>
                                        {request.id} · Registrada em {request.date}
                                    </span>
                                </div>

                                <span
                                    className={`resident-request-item__status resident-request-item__status--${request.status
                                        .toLowerCase()
                                        .replace(' ', '-')}`}
                                >
                                    {request.status}
                                </span>
                            </article>
                        ))
                    ) : (
                        <p className="resident-requests__empty">
                            Nenhuma solicitação encontrada.
                        </p>
                    )}
                </div>
            </section>

            <p className="resident-requests__disclaimer">
                Os registros são locais e demonstrativos. O envio real será integrado
                ao backend.
            </p>
        </div>
    )
}

export default ResidentRequestsPage