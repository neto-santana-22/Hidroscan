
import './NavigationMenu.css'

export type PageName =
    | 'Monitoramento'
    | 'Mapa da rede'
    | 'Equipamentos'
    | 'Alertas'
    | 'Ocorrências'
    | 'Ordens de serviço'
    | 'Relatórios'
    | 'Configurações'

interface NavigationMenuProps {
    isOpen: boolean
    activePage: PageName
    onNavigate: (page: PageName) => void
}

const navigationItems: {
    label: PageName
    description: string
}[] = [
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
        {
            label: 'Configurações',
            description: 'Preferências e ajustes do sistema',
        },
    ]

function NavigationMenu({
    isOpen,
    activePage,
    onNavigate,
}: NavigationMenuProps) {
    if (!isOpen) return null

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
