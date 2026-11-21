import { useEffect, useState, type FormEvent } from 'react'

import { ApiError } from '../api/client'
import { createResidentRequest, listProperties, listResidentRequests } from '../api/operations'
import {
    formatDateTime,
    residentRequestCategoryLabel,
    residentRequestStatusLabel,
    type Property,
    type ResidentRequest,
    type ResidentRequestCategory,
    type ResidentRequestStatus,
} from '../api/types'

import './ResidentRequestsPage.css'

// 'Todas' mostra tudo; os demais são os status da API.
type StatusFilter = 'Todas' | ResidentRequestStatus

// Listas de valores na ordem em que aparecem nos selects.
const categories = Object.keys(residentRequestCategoryLabel) as ResidentRequestCategory[]
const statuses = Object.keys(residentRequestStatusLabel) as ResidentRequestStatus[]

function errorMessage(err: unknown) {
    return err instanceof ApiError || err instanceof Error ? err.message : 'Erro inesperado.'
}

function ResidentRequestsPage() {
    const [requests, setRequests] = useState<ResidentRequest[]>([])
    const [properties, setProperties] = useState<Property[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [loadError, setLoadError] = useState('')

    // Campos do formulário de nova solicitação.
    const [propertyId, setPropertyId] = useState<number | ''>('')
    const [category, setCategory] = useState<ResidentRequestCategory>('leak')
    const [description, setDescription] = useState('')
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [formError, setFormError] = useState('')
    const [feedback, setFeedback] = useState('')

    const [filter, setFilter] = useState<StatusFilter>('Todas')

    // Busca as solicitações e os imóveis ao abrir a tela.
    // Se o morador tiver só um imóvel, ele já fica selecionado.
    useEffect(() => {
        Promise.all([listResidentRequests(), listProperties()])
            .then(([requestData, propertyData]) => {
                setRequests(requestData.results)
                setProperties(propertyData.results)
                if (propertyData.results.length > 0) {
                    setPropertyId(propertyData.results[0].id)
                }
            })
            .catch((err) => setLoadError(errorMessage(err)))
            .finally(() => setIsLoading(false))
    }, [])

    // Envia a nova solicitação e adiciona o retorno no topo da lista.
    async function handleSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault()
        if (propertyId === '') return

        setFormError('')
        setFeedback('')
        setIsSubmitting(true)

        try {
            const created = await createResidentRequest({
                property: propertyId,
                category,
                description,
            })
            setRequests((previous) => [created, ...previous])
            setDescription('')
            setCategory('leak')
            setFeedback(`Solicitação #${created.id} registrada com sucesso.`)
        } catch (err) {
            setFormError(errorMessage(err))
        } finally {
            setIsSubmitting(false)
        }
    }

    // Lista filtrada pelo status escolhido.
    const filteredRequests = requests.filter(
        (request) => filter === 'Todas' || request.status === filter,
    )

    return (
        <div className="resident-requests">
            <header className="resident-requests__heading">
                <div>
                    <span className="resident-requests__eyebrow">ÁREA DO MORADOR / SOLICITAÇÕES</span>
                    <h1>Minhas solicitações</h1>
                    <p>Registre ocorrências e acompanhe seus atendimentos.</p>
                </div>
            </header>

            <section className="resident-requests__panel">
                <div className="resident-requests__panel-heading">
                    <h2>Nova solicitação</h2>
                    <p>Descreva o que está acontecendo para registrar seu pedido.</p>
                </div>

                <form className="resident-request-form" onSubmit={handleSubmit}>
                    {/* O select de imóvel só aparece se o morador tiver mais de um. */}
                    {properties.length > 1 && (
                        <div className="resident-request-form__field">
                            <label htmlFor="request-property">Imóvel</label>
                            <select
                                id="request-property"
                                value={propertyId}
                                onChange={(event) => setPropertyId(Number(event.target.value))}
                            >
                                {properties.map((property) => (
                                    <option key={property.id} value={property.id}>
                                        {property.name}
                                    </option>
                                ))}
                            </select>
                        </div>
                    )}

                    <div className="resident-request-form__field">
                        <label htmlFor="request-category">Categoria</label>
                        <select
                            id="request-category"
                            value={category}
                            onChange={(event) => setCategory(event.target.value as ResidentRequestCategory)}
                        >
                            {categories.map((value) => (
                                <option key={value} value={value}>
                                    {residentRequestCategoryLabel[value]}
                                </option>
                            ))}
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

                    {formError && (
                        <p className="resident-requests__feedback" role="alert">{formError}</p>
                    )}

                    {feedback && (
                        <p className="resident-requests__feedback" role="status">{feedback}</p>
                    )}

                    <button
                        type="submit"
                        className="resident-requests__submit"
                        disabled={isSubmitting || propertyId === ''}
                    >
                        {isSubmitting ? 'Registrando...' : 'Registrar solicitação'}
                    </button>
                </form>
            </section>

            <section className="resident-requests__panel">
                <div className="resident-requests__list-heading">
                    <div>
                        <h2>Solicitações registradas</h2>
                        <p>
                            {isLoading ? 'Carregando...' : `${filteredRequests.length} registro(s) encontrado(s).`}
                        </p>
                    </div>

                    <select
                        aria-label="Filtrar solicitações por situação"
                        value={filter}
                        onChange={(event) => setFilter(event.target.value as StatusFilter)}
                    >
                        <option value="Todas">Todas</option>
                        {statuses.map((value) => (
                            <option key={value} value={value}>
                                {residentRequestStatusLabel[value]}
                            </option>
                        ))}
                    </select>
                </div>

                <div className="resident-requests__list">
                    {loadError ? (
                        <p className="resident-requests__empty" role="alert">{loadError}</p>
                    ) : filteredRequests.length === 0 && !isLoading ? (
                        <p className="resident-requests__empty">Nenhuma solicitação encontrada.</p>
                    ) : (
                        filteredRequests.map((request) => {
                            const status = residentRequestStatusLabel[request.status]
                            return (
                                <article className="resident-request-item" key={request.id}>
                                    <div>
                                        <strong>{residentRequestCategoryLabel[request.category]}</strong>
                                        <span>
                                            #{request.id} · Registrada em {formatDateTime(request.created_at)}
                                        </span>
                                        <p>{request.description}</p>
                                        {request.resolution && (
                                            <p><em>Parecer: {request.resolution}</em></p>
                                        )}
                                    </div>

                                    <span
                                        className={`resident-request-item__status resident-request-item__status--${request.status.replaceAll('_', '-')}`}
                                    >
                                        {status}
                                    </span>
                                </article>
                            )
                        })
                    )}
                </div>
            </section>
        </div>
    )
}

export default ResidentRequestsPage