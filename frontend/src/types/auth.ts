
export type UserRole =
    | 'morador'
    | 'operador'
    | 'tecnico'
    | 'administrador'

export interface User {
    id: string
    name: string
    email: string
    role: UserRole
}

export interface LoginCredentials {
    email: string
    password: string
}

export interface AuthContextData {
    user: User | null
    isAuthenticated: boolean
    isLoading: boolean
    login: (credentials: LoginCredentials) => Promise<void>
    logout: () => void
}
