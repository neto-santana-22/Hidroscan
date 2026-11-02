
import {
    createContext,
    useContext,
    useState,
    type ReactNode,
} from 'react'

import type {
    AuthContextData,
    LoginCredentials,
    User,
    UserRole,
} from '../types/auth'

const AuthContext = createContext<AuthContextData | undefined>(undefined)

const demoUsers: Record<UserRole, User> = {
    morador: {
        id: '1',
        name: 'Maria Silva',
        email: 'morador@hidroscan.com',
        role: 'morador',
    },
    operador: {
        id: '2',
        name: 'Carlos Santos',
        email: 'operador@hidroscan.com',
        role: 'operador',
    },
    tecnico: {
        id: '3',
        name: 'João Oliveira',
        email: 'tecnico@hidroscan.com',
        role: 'tecnico',
    },
    administrador: {
        id: '4',
        name: 'Ana Costa',
        email: 'admin@hidroscan.com',
        role: 'administrador',
    },
}

interface AuthProviderProps {
    children: ReactNode
}

export function AuthProvider({ children }: AuthProviderProps) {
    const [user, setUser] = useState<User | null>(null)

    async function login(credentials: LoginCredentials) {
        const email = credentials.email.trim().toLowerCase()

        const matchedUser = Object.values(demoUsers).find(
            (demoUser) => demoUser.email === email,
        )

        if (!matchedUser || !credentials.password.trim()) {
            throw new Error('E-mail ou senha inválidos.')
        }

        setUser(matchedUser)
    }

    function logout() {
        setUser(null)
    }

    return (
        <AuthContext.Provider
            value={{
                user,
                isAuthenticated: user !== null,
                isLoading: false,
                login,
                logout,
            }}
        >
            {children}
        </AuthContext.Provider>
    )
}

export function useAuth() {
    const context = useContext(AuthContext)

    if (!context) {
        throw new Error('useAuth deve ser utilizado dentro de AuthProvider')
    }

    return context
}
