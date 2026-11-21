export type UserRole = 'morador' | 'tecnico'

export interface User {
    id: number
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
    logout: () => Promise<void>
}