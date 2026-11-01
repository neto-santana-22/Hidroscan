
import { useState, type ReactNode } from 'react'
import Header from '../components/Header'
import NavigationMenu, {
    type PageName,
} from '../components/NavigationMenu'
import MonitoringPage from '../pages/MonitoringPage'
import './MainLayout.css'

interface MainLayoutProps {
    children?: ReactNode
}

function MainLayout({ children }: MainLayoutProps) {
    const [menuOpen, setMenuOpen] = useState(false)
    const [activePage, setActivePage] = useState<PageName>('Monitoramento')

    function handleNavigate(page: PageName) {
        setActivePage(page)
        setMenuOpen(false)
    }

    function renderPage() {
        if (children) {
            return children
        }

        switch (activePage) {
            case 'Monitoramento':
                return <MonitoringPage />

            default:
                return (
                    <section className="page-placeholder">
                        <span className="page-placeholder__eyebrow">
                            HIDROSCAN / PAINEL
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
