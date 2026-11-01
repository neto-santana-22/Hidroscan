
import './App.css'
import { useState } from 'react'
import './App.css'
import MainLayout from './layouts/MainLayout'

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false)

  if (isLoggedIn) {
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

          <form
            className="login-form"
            onSubmit={(event) => {
              event.preventDefault()
              setIsLoggedIn(true)
            }}
          >
            <div className="form-field">
              <label htmlFor="email">E-mail</label>

              <input
                id="email"
                name="email"
                type="email"
                placeholder="seu@email.com"
                autoComplete="email"
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
                required
              />
            </div>

            <button className="login-submit" type="submit">
              Entrar
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
