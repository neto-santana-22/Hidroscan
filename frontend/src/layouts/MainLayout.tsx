
import { useState, type ReactNode } from 'react'

import Header from '../components/Header'
import NavigationMenu, {
    type PageName,
} from '../components/NavigationMenu'

import MonitoringPage from '../pages/MonitoringPage'

// Módulos do morador
import ResidentOverviewPage from '../pages/ResidentOverviewPage'
import ResidentConsumptionPage from '../pages/ResidentConsumptionPage'
import ResidentHistoryPage from '../pages/ResidentHistoryPage'
import ResidentNoticesPage from '../pages/ResidentNoticesPage'
import ResidentRequestsPage from '../pages/ResidentRequestsPage'
import ResidentAccountPage from '../pages/ResidentAccountPage'

// Módulos do técnico
import TechnicianOrdersPage from '../pages/TechnicianOrdersPage'
import TechnicianEquipmentPage from '../pages/TechnicianEquipmentPage'
import TechnicianHistoryPage from '../pages/TechnicianHistoryPage'
import TechnicianAlertsPage from '../pages/TechnicianAlertsPage'
import TechnicianProfilePage from '../pages/TechnicianProfilePage'

import { useAuth } from '../contexts/AuthContext'
import type { UserRole } from '../types/auth'

import './MainLayout.css'

interface MainLayoutProps {
    children?: ReactNode
}

const initialPageByRole: Record<UserRole, PageName> = {
    morador: 'Visão geral',
    operador: 'Monitoramento',
    tecnico: 'Minhas ordens',
    administrador: 'Monitoramento',
}

function MainLayout({ children }: MainLayoutProps) {
    const { user } = useAuth()

    const [menuOpen, setMenuOpen] = useState(false)

    const [activePage, setActivePage] = useState<PageName>(
        user ? initialPageByRole[user.role] : 'Monitoramento',
    )

    if (!user) {
        return null
    }

    const currentUserRole = user.role

    function handleNavigate(page: PageName) {
        setActivePage(page)
        setMenuOpen(false)
    }

    function renderPage() {
        if (children) {
            return children
        }

        switch (activePage) {
            // Monitoramento
            case 'Monitoramento':
                return <MonitoringPage />

            // Perfil do morador
            case 'Visão geral':
                return <ResidentOverviewPage />

            case 'Meu consumo':
                return <ResidentConsumptionPage />

            case 'Histórico de consumo':
                return <ResidentHistoryPage />

            case 'Comunicados':
                return <ResidentNoticesPage />

            case 'Minhas solicitações':
                return <ResidentRequestsPage />

            case 'Minha conta':
                return <ResidentAccountPage />

            // Perfil do técnico
            case 'Minhas ordens':
                return <TechnicianOrdersPage />

            case 'Equipamentos':
                return <TechnicianEquipmentPage />

            case 'Histórico técnico':
                return <TechnicianHistoryPage />

            case 'Alertas técnicos':
                return <TechnicianAlertsPage />

            case 'Meu perfil':
                return <TechnicianProfilePage />

            // Módulos ainda não implementados
            default:
                return (
                    <section className="page-placeholder">
                        <span className="page-placeholder__eyebrow">
                            HIDROSCAN / {currentUserRole.toUpperCase()}
                        </span>

                        <h1>{activePage}</h1>

                        <p>
                            Este módulo será desenvolvido nas próximas etapas.
                        </p>
                    </section>
                )
        }
    }

    return (
        <div className="main-layout">
            <Header
                onMenuToggle={() => setMenuOpen((previous) => !previous)}
                menuOpen={menuOpen}
            />

            <NavigationMenu
                isOpen={menuOpen}
                activePage={activePage}
                onNavigate={handleNavigate}
            />

            <main className="main-content">
                {renderPage()}
            </main>
        </div>
    )
}

export default MainLayout
