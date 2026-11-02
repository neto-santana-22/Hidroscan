
import './NavigationMenu.css'
import { useAuth } from '../contexts/AuthContext'
import type { UserRole } from '../types/auth'

export type PageName =
    | 'Visão geral'
    | 'Meu consumo'
    | 'Histórico de consumo'
    | 'Comunicados'
    | 'Minhas solicitações'
    | 'Minha conta'
    | 'Monitoramento'
    | 'Mapa da rede'
    | 'Equipamentos'
    | 'Alertas'
    | 'Ocorrências'
    | 'Ordens de serviço'
    | 'Relatórios'
    | 'Minhas ordens'
    | 'Histórico técnico'
    | 'Alertas técnicos'
    | 'Meu perfil'
    | 'Gestão de usuários'
    | 'Permissões'
    | 'Auditoria'
    | 'Configurações'

interface NavigationMenuProps {
    isOpen: boolean
    activePage: PageName
    onNavigate: (page: PageName) => void
}

interface NavigationItem {
    label: PageName
    description: string
}

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

    operador: [
        {
            label: 'Monitoramento',
            description: 'Indicadores e dados em tempo real',
        },
        {
            label: 'Mapa da rede',
            description: 'Visualização da rede de distribuição',
        },
        {
            label: 'Equipamentos',
            description: 'Sensores e dispositivos instalados',
        },
        {
            label: 'Alertas',
            description: 'Eventos que exigem atenção',
        },
        {
            label: 'Ocorrências',
            description: 'Registro de problemas identificados',
        },
        {
            label: 'Ordens de serviço',
            description: 'Acompanhamento de intervenções',
        },
        {
            label: 'Relatórios',
            description: 'Dados e indicadores operacionais',
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

    administrador: [
        {
            label: 'Monitoramento',
            description: 'Visão geral da operação',
        },
        {
            label: 'Gestão de usuários',
            description: 'Gerencie usuários e cadastros',
        },
        {
            label: 'Equipamentos',
            description: 'Gerencie sensores e dispositivos',
        },
        {
            label: 'Permissões',
            description: 'Controle de acesso por perfil',
        },
        {
            label: 'Relatórios',
            description: 'Indicadores e relatórios do sistema',
        },
        {
            label: 'Auditoria',
            description: 'Histórico de ações e alterações',
        },
        {
            label: 'Configurações',
            description: 'Configurações gerais da plataforma',
        },
    ],
}

function NavigationMenu({
    isOpen,
    activePage,
    onNavigate,
}: NavigationMenuProps) {
    const { user } = useAuth()

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
