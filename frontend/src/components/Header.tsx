
import './Header.css'

interface HeaderProps {
    onMenuToggle: () => void
    menuOpen: boolean
}

function Header({ onMenuToggle, menuOpen }: HeaderProps) {
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
                <div className="user-avatar">U</div>

                <div className="user-info">
                    <span className="user-name">Usuário</span>
                    <span className="user-role">Operador</span>
                </div>
            </div>
        </header>
    )
}

export default Header
