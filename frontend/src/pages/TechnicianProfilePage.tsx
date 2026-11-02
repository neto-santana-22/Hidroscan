
import { useState } from 'react'
import { useAuth } from '../contexts/AuthContext'

import './TechnicianProfilePage.css'

function TechnicianProfilePage() {
    const { user } = useAuth()

    const [name, setName] = useState(user?.name ?? '')
    const [email, setEmail] = useState(user?.email ?? '')
    const [phone, setPhone] = useState('(81) 99999-0000')
    const [registration, setRegistration] = useState('TEC-2026-004')
    const [specialty, setSpecialty] = useState('Manutenção de equipamentos')
    const [message, setMessage] = useState('')

    function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
        event.preventDefault()

        if (!name.trim() || !email.trim() || !phone.trim()) {
            setMessage('Preencha todos os campos obrigatórios.')
            return
        }

        setMessage(
            'Alterações registradas nesta demonstração. Os dados não foram enviados ao servidor.',
        )
    }

    return (
        <section className="technician-profile">
            <header className="technician-heading">
                <div>
                    <span className="technician-eyebrow">ÁREA TÉCNICA</span>
                    <h1>Meu perfil</h1>
                    <p>Consulte e atualize suas informações profissionais.</p>
                </div>
                <span className="technician-data-label">Dados simulados</span>
            </header>

            <section className="technician-profile-card">
                <div className="technician-profile-avatar">
                    {name.trim().charAt(0).toUpperCase() || 'T'}
                </div>

                <div className="technician-profile-identity">
                    <h2>{name || 'Técnico'}</h2>
                    <p>Técnico de campo</p>
                    <span>Perfil técnico</span>
                </div>
            </section>

            <form className="technician-profile-form" onSubmit={handleSubmit}>
                <div className="technician-profile-section-heading">
                    <h2>Informações pessoais</h2>
                    <p>Dados de identificação e contato.</p>
                </div>

                <div className="technician-profile-fields">
                    <label>
                        Nome completo
                        <input
                            type="text"
                            value={name}
                            onChange={(event) => {
                                setName(event.target.value)
                                setMessage('')
                            }}
                            required
                        />
                    </label>

                    <label>
                        E-mail
                        <input
                            type="email"
                            value={email}
                            onChange={(event) => {
                                setEmail(event.target.value)
                                setMessage('')
                            }}
                            required
                        />
                    </label>

                    <label>
                        Telefone
                        <input
                            type="tel"
                            value={phone}
                            onChange={(event) => {
                                setPhone(event.target.value)
                                setMessage('')
                            }}
                            required
                        />
                    </label>
                </div>

                <div className="technician-profile-section-heading">
                    <h2>Informações profissionais</h2>
                    <p>Dados de identificação dentro da equipe técnica.</p>
                </div>

                <div className="technician-profile-fields">
                    <label>
                        Matrícula
                        <input
                            type="text"
                            value={registration}
                            onChange={(event) => setRegistration(event.target.value)}
                        />
                    </label>

                    <label>
                        Especialidade
                        <input
                            type="text"
                            value={specialty}
                            onChange={(event) => setSpecialty(event.target.value)}
                        />
                    </label>

                    <label>
                        Função
                        <input type="text" value="Técnico de campo" disabled />
                    </label>
                </div>

                {message && (
                    <p
                        className="technician-profile-message"
                        role="status"
                    >
                        {message}
                    </p>
                )}

                <div className="technician-profile-actions">
                    <button type="submit">Salvar alterações</button>
                </div>
            </form>
        </section>
    )
}

export default TechnicianProfilePage
