import { useAuth } from '../contexts/AuthContext'

import './TechnicianProfilePage.css'

function TechnicianProfilePage() {
    // Dados vindos de /api/auth/me/, guardados no AuthContext quando a sessão é verificada.
    const { user } = useAuth()

    const name = user?.name ?? ''
    const email = user?.email ?? ''

    return (
        <section className="technician-profile">
            <header className="technician-heading">
                <div>
                    <span className="technician-eyebrow">ÁREA TÉCNICA</span>
                    <h1>Meu perfil</h1>
                    <p>Dados da sua conta no sistema.</p>
                </div>
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

            <form className="technician-profile-form">
                <div className="technician-profile-section-heading">
                    <h2>Informações da conta</h2>
                    <p>Estes dados são gerenciados pelo administrador do sistema.</p>
                </div>

                <div className="technician-profile-fields">
                    <label>
                        Nome completo
                        <input type="text" value={name} readOnly />
                    </label>

                    <label>
                        E-mail
                        <input type="email" value={email} readOnly />
                    </label>

                    <label>
                        Função
                        <input type="text" value="Técnico de campo" readOnly />
                    </label>
                </div>
            </form>
        </section>
    )
}

export default TechnicianProfilePage