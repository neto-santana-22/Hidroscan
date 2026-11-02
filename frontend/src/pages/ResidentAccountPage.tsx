import { useState, type FormEvent } from 'react'

import { useAuth } from '../contexts/AuthContext'
import { residentSummary } from '../data/ResidentData'

import './ResidentAccountPage.css'

function ResidentAccountPage() {
    const { user } = useAuth()

    const [name, setName] = useState(user?.name ?? '')
    const [email, setEmail] = useState(user?.email ?? '')
    const [phone, setPhone] = useState('(00) 00000-0000')
    const [address, setAddress] = useState('Endereço demonstrativo')
    const [feedback, setFeedback] = useState('')

    if (!user) {
        return null
    }

    function handleSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault()
        setFeedback('Alterações registradas apenas nesta demonstração.')
    }

    return (
        <div className="resident-account">
            <header className="resident-account__heading">
                <div>
                    <span className="resident-account__eyebrow">
                        ÁREA DO MORADOR / MINHA CONTA
                    </span>
                    <h1>Minha conta</h1>
                    <p>Consulte e atualize seus dados cadastrais.</p>
                </div>

                <span className="resident-account__demo">Dados simulados</span>
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
                    <p>Informações cadastrais da sua conta.</p>
                </div>

                <form className="resident-account__form" onSubmit={handleSubmit}>
                    <div className="resident-account__fields">
                        <div className="resident-account__field">
                            <label htmlFor="account-name">Nome completo</label>
                            <input
                                id="account-name"
                                value={name}
                                onChange={(event) => setName(event.target.value)}
                                required
                            />
                        </div>

                        <div className="resident-account__field">
                            <label htmlFor="account-email">E-mail</label>
                            <input
                                id="account-email"
                                type="email"
                                value={email}
                                onChange={(event) => setEmail(event.target.value)}
                                required
                            />
                        </div>

                        <div className="resident-account__field">
                            <label htmlFor="account-phone">Telefone</label>
                            <input
                                id="account-phone"
                                value={phone}
                                onChange={(event) => setPhone(event.target.value)}
                                placeholder="(00) 00000-0000"
                            />
                        </div>

                        <div className="resident-account__field">
                            <label htmlFor="account-address">Endereço</label>
                            <input
                                id="account-address"
                                value={address}
                                onChange={(event) => setAddress(event.target.value)}
                            />
                        </div>
                    </div>

                    {feedback && (
                        <p className="resident-account__feedback" role="status">
                            {feedback}
                        </p>
                    )}

                    <button type="submit">Salvar alterações</button>
                </form>
            </section>

            <section className="resident-account__panel">
                <div className="resident-account__panel-heading">
                    <h2>Unidade consumidora</h2>
                    <p>Dados vinculados ao seu cadastro de abastecimento.</p>
                </div>

                <div className="resident-account__unit">
                    <div>
                        <span>Identificação da unidade</span>
                        <strong>{residentSummary.unit}</strong>
                    </div>

                    <div>
                        <span>Responsável</span>
                        <strong>{name || user.name}</strong>
                    </div>
                </div>
            </section>

            <p className="resident-account__disclaimer">
                A edição é demonstrativa. A atualização real dos dados será realizada
                pela API do sistema.
            </p>
        </div>
    )
}

export default ResidentAccountPage