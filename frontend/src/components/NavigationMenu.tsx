import './NavigationMenu.css'
import { useAuth } from '../contexts/AuthContext'
import type { UserRole } from '../types/auth'

// Todas as telas que o menu pode abrir. Cada nome aparece como título de um item.
export type PageName =
    | 'Visão geral'
    | 'Meu consumo'
    | 'Histórico de consumo'
    | 'Comunicados'
    | 'Minhas solicitações'
    | 'Minha conta'
    | 'Minhas ordens'
    | 'Histórico técnico'
    | 'Alertas técnicos'
    | 'Meu perfil'
    | 'Equipamentos'

interface NavigationMenuProps {
    isOpen: boolean
    activePage: PageName
    onNavigate: (page: PageName) => void
}

interface NavigationItem {
    label: PageName
    description: string
}

// Itens do menu para cada perfil. Operador e administrador não existem mais no frontend.
const navigationByRole: Record<UserRole, NavigationItem[]> = {
    morador: [
        {
            label: 'Visão geral',
            description: 'Resumo da sua conta e situação',
        },
        {
            label: 'Meu consumo',
            description: 'Acompanhe seu consumo de água',
        },
        {
            label: 'Histórico de consumo',
            description: 'Consulte seu histórico',
        },
        {
            label: 'Comunicados',
            description: 'Avisos e informações importantes',
        },
        {
            label: 'Minhas solicitações',
            description: 'Registre e acompanhe solicitações',
        },
        {
            label: 'Minha conta',
            description: 'Dados pessoais e preferências',
        },
    ],

    tecnico: [
        {
            label: 'Minhas ordens',
            description: 'Serviços atribuídos a você',
        },
        {
            label: 'Equipamentos',
            description: 'Consulte equipamentos e sensores',
        },
        {
            label: 'Histórico técnico',
            description: 'Intervenções e manutenções realizadas',
        },
        {
            label: 'Alertas técnicos',
            description: 'Alertas relacionados aos equipamentos',
        },
        {
            label: 'Meu perfil',
            description: 'Seus dados profissionais',
        },
    ],
}

function NavigationMenu({
    isOpen,
    activePage,
    onNavigate,
}: NavigationMenuProps) {
    const { user } = useAuth()

    // Fecha o menu quando está fechado ou quando não há usuário logado.
    if (!isOpen || !user) return null

    const navigationItems = navigationByRole[user.role]

    return (
        <nav className="navigation-menu" aria-label="Navegação principal">
            <div className="navigation-menu__header">
                <span>MENU PRINCIPAL</span>
            </div>

            <div className="navigation-menu__items">
                {navigationItems.map((item) => (
                    <button
                        key={item.label}
                        type="button"
                        className={`navigation-menu__item ${activePage === item.label
                            ? 'navigation-menu__item--active'
                            : ''
                            }`}
                        onClick={() => onNavigate(item.label)}
                        aria-current={activePage === item.label ? 'page' : undefined}
                    >
                        <span className="navigation-menu__label">
                            {item.label}
                        </span>

                        <span className="navigation-menu__description">
                            {item.description}
                        </span>
                    </button>
                ))}
            </div>
        </nav>
    )
}

export default NavigationMenu