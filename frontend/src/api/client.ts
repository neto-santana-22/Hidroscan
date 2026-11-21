// Cliente HTTP simples para a API Django (sessão + CSRF).

export class ApiError extends Error {
    status: number

    constructor(message: string, status: number) {
        super(message)
        this.status = status
    }
}

function getCookie(name: string): string | null {
    const match = document.cookie.match(new RegExp(`(^|;\\s*)${name}=([^;]*)`))
    return match ? decodeURIComponent(match[2]) : null
}

// Garante o cookie csrftoken antes de qualquer requisição que altera dados.
export async function ensureCsrf() {
    if (!getCookie('csrftoken')) {
        await fetch('/api/auth/csrf/', { credentials: 'include' })
    }
}

export async function apiFetch<T>(
    path: string,
    options: { method?: string; body?: unknown } = {},
): Promise<T> {
    const method = options.method ?? 'GET'
    const headers: Record<string, string> = {}

    if (method !== 'GET') {
        await ensureCsrf()
        headers['X-CSRFToken'] = getCookie('csrftoken') ?? ''
    }
    if (options.body !== undefined) {
        headers['Content-Type'] = 'application/json'
    }

    const response = await fetch(path, {
        method,
        credentials: 'include',
        headers,
        body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
    })

    if (response.status === 204) {
        return undefined as T
    }

    const data = await response.json().catch(() => null)

    if (!response.ok) {
        const message =
            (data && (data.detail || data.non_field_errors?.[0])) ||
            (response.status === 404
                ? 'Recurso não encontrado ou fora do seu escopo.'
                : 'Não foi possível concluir a operação.')
        throw new ApiError(message, response.status)
    }

    return data as T
}