import {
    createContext,
    useContext,
    useEffect,
    useState,
    type ReactNode,
} from 'react'

import { apiFetch, ensureCsrf } from '../api/client'
import type {
    AuthContextData,
    LoginCredentials,
    User,
} from '../types/auth'

const AuthContext = createContext<AuthContextData | undefined>(undefined)

interface AuthProviderProps {
    children: ReactNode
}

// Formato do usuário que a API devolve em /api/auth/me/ e /api/auth/login/.
interface ApiUser {
    id: number
    email: string
    name: string
    role: string
}

// Converte o usuário da API para o formato do frontend.
// Retorna null para perfis que não usam este aplicativo (operador e administrador).
function toUser(data: ApiUser): User | null {
    if (data.role !== 'morador' && data.role !== 'tecnico') return null
    return { id: data.id, email: data.email, name: data.name, role: data.role }
}

export function AuthProvider({ children }: AuthProviderProps) {
    const [user, setUser] = useState<User | null>(null)
    // Começa como true para não mostrar a tela de login antes de descobrir se já existe sessão.
    const [isLoading, setIsLoading] = useState(true)

    // Ao abrir a página, pergunta à API se existe uma sessão ativa.
    useEffect(() => {
        apiFetch<ApiUser>('/api/auth/me/')
            .then((data) => setUser(toUser(data)))
            .catch(() => setUser(null))
            .finally(() => setIsLoading(false))
    }, [])

    // Faz login: pega o token CSRF, envia e-mail e senha, e guarda o usuário.
    async function login(credentials: LoginCredentials) {
        await ensureCsrf()

        const data = await apiFetch<ApiUser>('/api/auth/login/', {
            method: 'POST',
            body: {
                email: credentials.email.trim().toLowerCase(),
                password: credentials.password,
            },
        })

        const loggedUser = toUser(data)
        if (!loggedUser) {
            throw new Error('Este perfil não tem acesso ao aplicativo.')
        }
        setUser(loggedUser)
    }

    // Encerra a sessão no backend e limpa o usuário, mesmo se a chamada falhar.
    async function logout() {
        try {
            await apiFetch('/api/auth/logout/', { method: 'POST' })
        } finally {
            setUser(null)
        }
    }

    return (
        <AuthContext.Provider
            value={{
                user,
                isAuthenticated: user !== null,
                isLoading,
                login,
                logout,
            }}
        >
            {children}
        </AuthContext.Provider>
    )
}

// Hook para os componentes lerem o usuário e as funções de login e logout.
export function useAuth() {
    const context = useContext(AuthContext)

    if (!context) {
        throw new Error('useAuth deve ser utilizado dentro de AuthProvider')
    }

    return context
}