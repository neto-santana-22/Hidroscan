
import { useState, type FormEvent } from 'react'
import './App.css'
import MainLayout from './layouts/MainLayout'
import { useAuth } from './contexts/AuthContext'

function App() {
  const { isAuthenticated, login } = useAuth()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function handleLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    setIsSubmitting(true)

    try {
      await login({ email, password })
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Não foi possível realizar o login.',
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  if (isAuthenticated) {
    return <MainLayout />
  }

  return (
    <main className="login-page">
      <header className="login-header">
        <a className="brand" href="/" aria-label="Hidroscan - início">
          <span className="brand__icon">H</span>
          <span>HIDROSCAN</span>
        </a>
      </header>

      <section className="login-content">
        <div className="login-card">
          <div className="login-heading">
            <span className="login-eyebrow">
              PLATAFORMA DE MONITORAMENTO
            </span>

            <h1>Acesse sua conta</h1>

            <p>
              Entre para acompanhar o monitoramento e a gestão dos recursos
              hídricos.
            </p>
          </div>

          <form className="login-form" onSubmit={handleLogin}>
            <div className="form-field">
              <label htmlFor="email">E-mail</label>

              <input
                id="email"
                name="email"
                type="email"
                placeholder="seu@email.com"
                autoComplete="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
              />
            </div>

            <div className="form-field">
              <div className="form-label-row">
                <label htmlFor="password">Senha</label>
                <a href="#recuperar-senha">Esqueceu a senha?</a>
              </div>

              <input
                id="password"
                name="password"
                type="password"
                placeholder="Digite sua senha"
                autoComplete="current-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
              />
            </div>

            {error && (
              <p className="login-error" role="alert">
                {error}
              </p>
            )}

            <button
              className="login-submit"
              type="submit"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Entrando...' : 'Entrar'}
            </button>
          </form>

          <div className="login-divider">
            <span>OU</span>
          </div>

          <button
            className="google-login"
            type="button"
            disabled
            title="Login com Google será integrado posteriormente"
          >
            <img
              src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg"
              alt=""
              className="google-icon"
            />

            Continuar com Google
          </button>

          <div className="login-footer">
            <span>Hidroscan</span>
            <span>Monitoramento inteligente de água</span>
          </div>
        </div>
      </section>
    </main>
  )
}

export default App
