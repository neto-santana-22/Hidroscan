import { useEffect, useState } from 'react'

import { apiFetch } from '../api/client'
import { type Paginated, type Property } from '../api/types'
import { useAuth } from '../contexts/AuthContext'

import './ResidentAccountPage.css'

function errorMessage(err: unknown) {
    return err instanceof Error ? err.message : 'Erro inesperado.'
}

function ResidentAccountPage() {
    // Nome e e-mail vêm de /api/auth/me/, guardados no AuthContext.
    const { user } = useAuth()

    // Imóveis do morador, vindos de /api/imoveis/ (a API já filtra pelo dono).
    const [properties, setProperties] = useState<Property[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [loadError, setLoadError] = useState('')

    useEffect(() => {
        apiFetch<Paginated<Property>>('/api/imoveis/')
            .then((data) => setProperties(data.results))
            .catch((err) => setLoadError(errorMessage(err)))
            .finally(() => setIsLoading(false))
    }, [])

    if (!user) {
        return null
    }

    const name = user.name
    const email = user.email

    return (
        <div className="resident-account">
            <header className="resident-account__heading">
                <div>
                    <span className="resident-account__eyebrow">
                        ÁREA DO MORADOR / MINHA CONTA
                    </span>
                    <h1>Minha conta</h1>
                    <p>Consulte seus dados cadastrais e os imóveis vinculados.</p>
                </div>
            </header>

            <section className="resident-account__profile">
                <div className="resident-account__avatar">
                    {name.trim().charAt(0).toUpperCase() || 'M'}
                </div>

                <div>
                    <h2>{name || 'Morador'}</h2>
                    <p>{email}</p>
                    <span>Perfil de morador</span>
                </div>
            </section>

            <section className="resident-account__panel">
                <div className="resident-account__panel-heading">
                    <h2>Dados pessoais</h2>
                    <p>Estes dados são gerenciados pelo administrador do sistema.</p>
                </div>

                <div className="resident-account__fields">
                    <div className="resident-account__field">
                        <label htmlFor="account-name">Nome completo</label>
                        <input id="account-name" value={name} readOnly />
                    </div>

                    <div className="resident-account__field">
                        <label htmlFor="account-email">E-mail</label>
                        <input id="account-email" type="email" value={email} readOnly />
                    </div>
                </div>
            </section>

            <section className="resident-account__panel">
                <div className="resident-account__panel-heading">
                    <h2>Unidade consumidora</h2>
                    <p>Imóveis vinculados ao seu cadastro.</p>
                </div>

                {isLoading ? (
                    <p>Carregando imóveis...</p>
                ) : loadError ? (
                    <p role="alert">{loadError}</p>
                ) : properties.length === 0 ? (
                    <p>Nenhum imóvel vinculado à sua conta.</p>
                ) : (
                    properties.map((property) => (
                        <div className="resident-account__unit" key={property.id}>
                            <div>
                                <span>Identificação da unidade</span>
                                <strong>{property.name}</strong>
                            </div>

                            <div>
                                <span>Endereço</span>
                                <strong>{property.address}</strong>
                            </div>
                        </div>
                    ))
                )}
            </section>

            <p className="resident-account__disclaimer">
                Para alterar seus dados, procure a administração do sistema.
            </p>
        </div>
    )
}

export default ResidentAccountPage