import './Header.css'
import { useAuth } from '../contexts/AuthContext'

interface HeaderProps {
    onMenuToggle: () => void
    menuOpen: boolean
}

// Nome do perfil em português, exibido abaixo do nome do usuário.
const roleLabel = {
    morador: 'Morador',
    tecnico: 'Técnico',
} as const

function Header({ onMenuToggle, menuOpen }: HeaderProps) {
    const { user, logout } = useAuth()

    // Primeira letra do nome, usada no avatar.
    const initial = user?.name.charAt(0).toUpperCase() ?? 'U'

    return (
        <header className="app-header">
            <div className="app-header__left">
                <button
                    className="menu-toggle"
                    type="button"
                    onClick={onMenuToggle}
                    aria-label={menuOpen ? 'Fechar menu' : 'Abrir menu'}
                    aria-expanded={menuOpen}
                >
                    <span />
                    <span />
                    <span />
                </button>

                <a className="brand" href="/" aria-label="Hidroscan">
                    <span className="brand__icon">H</span>
                    <span>HIDROSCAN</span>
                </a>
            </div>

            <div className="app-header__user">
                <div className="user-avatar">{initial}</div>

                <div className="user-info">
                    <span className="user-name">{user?.name ?? 'Usuário'}</span>
                    <span className="user-role">
                        {user ? roleLabel[user.role] : ''}
                    </span>
                </div>

                {/* Encerra a sessão no backend e volta para a tela de login. */}
                <button
                    type="button"
                    className="logout-button"
                    onClick={() => logout()}
                >
                    Sair
                </button>
            </div>
        </header>
    )
}

export default Header