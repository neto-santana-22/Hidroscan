# Hidroscan — Implementações e plano da Etapa 6

Este documento consolida as decisões e entregas verificadas das etapas 1 a 5 e define a estratégia da etapa 6: integrar o frontend React/Vite à API Django. O backend já possui os domínios principais; o frontend ainda utiliza autenticação e conjuntos de dados simulados.

## Visão do estado atual

```text
Frontend React/Vite
  └── /api/* — sessão e CSRF
        └── Django REST Framework
              ├── serviços e transações
              ├── regras puras de alertas
              └── ORM Django → SQLite

Sensor/simulador
  └── POST /api/leituras/ — X-Device-Key
        └── serviço de leituras → motor de alertas
```

- Banco: SQLite em `db.sqlite3`, ignorado pelo Git.
- Schema: models e migrations Django são a fonte de verdade.
- Contrato: `GET /api/schema/`; documentação interativa: `GET /api/docs/`.
- Autenticação web: sessão Django e token CSRF.
- Autenticação de dispositivo: somente `X-Device-Key` no endpoint de ingestão.

## Etapa 1 — fundação

### Implementado

- Settings separados em `setup/settings/base.py`, `dev.py` e `prod.py`.
- SQLite fixado como banco da aplicação; MySQL e `mysqlclient` foram removidos da configuração do projeto.
- Django REST Framework configurado com `SessionAuthentication`, paginação e permissão autenticada padrão.
- `drf-spectacular` configurado para schema e documentação OpenAPI.
- WhiteNoise configurado para arquivos estáticos de produção.
- DRF atualizado para `3.18.3`, compatível com Django `6.1.2`.

### Observação pendente: `.env`

O `.env` local possui sintaxe inválida para `SECRET_KEY` se usar espaços ao redor de `=`. O formato aceito é:

```env
SECRET_KEY=valor-secreto
```

O valor da chave não foi alterado durante as etapas. Sem a correção, o processo Django não inicia sem que `SECRET_KEY` seja fornecida pelo ambiente.

## Etapa 2 — usuários, escopo e cadastros

### Correções posteriores à revisão técnica

- Schema e documentação OpenAPI agora exigem usuário autenticado por meio de `SPECTACULAR_SETTINGS["SERVE_PERMISSIONS"]`. O padrão do `drf-spectacular` seria `AllowAny` e deixaria `/api/schema/` e `/api/docs/` públicos.
- O cadastro administrativo de usuário exige `role`; a ausência retorna validação `400`, em vez de gerar erro interno no serviço.
- A verificação de e-mail passou a receber `email + code` sem exigir sessão, permitindo que técnicos ainda não verificados concluam o fluxo. A escrita continua protegida por CSRF e respostas inválidas são genéricas.
- Tentativas inválidas de verificação são persistidas antes da resposta de erro. Após cinco falhas, novos códigos, inclusive corretos, são recusados até o envio de novo código.
- A auditoria genérica por `post_save` de usuário foi removida. Ela registrava mudanças internas, como `last_login`, e atribuía a alteração ao usuário afetado. Criação e edição administrativas são agora auditadas no endpoint com o administrador autenticado como ator; login e logout permanecem eventos explícitos.
- Na criação de dispositivo, `active` é aceito e persistido. `valve_state` é somente leitura e qualquer tentativa de defini-lo pela API é recusada; o estado só muda pelo comando de válvula auditado.

### Entidades

| App | Entidades/responsabilidades |
| --- | --- |
| `accounts` | `User` por e-mail, perfis, verificação de técnico e sessão. |
| `hidroscan` | `Region`, `Property`, `Device`, `RegionAccess` e `AuditLog`. |

O usuário customizado possui os perfis `morador`, `operador`, `tecnico` e `administrador`. Técnicos só autenticam após e-mail verificado. O código de verificação possui hash, validade de cinco minutos, limite de cinco tentativas e uso único.

### Escopo de dados

`imoveis_visiveis(usuario)` é o ponto central de autorização:

- administrador: todos os imóveis;
- morador: imóveis em que é proprietário;
- operador/técnico com `todas_regioes`: todos;
- operador/técnico comum: imóveis nas regiões cadastradas em `RegionAccess`;
- operador/técnico sem região: nenhum imóvel.

Recursos fora do escopo retornam `404`, não confirmação de existência.

### Endpoints

| Endpoint | Método | Finalidade |
| --- | --- | --- |
| `/api/auth/csrf/` | GET | Emite cookie CSRF. |
| `/api/auth/login/` | POST | Inicia sessão; exige CSRF. |
| `/api/auth/logout/` | POST | Encerra sessão. |
| `/api/auth/me/` | GET | Retorna usuário da sessão. |
| `/api/auth/verificacao-email/` | POST | Confirma código do técnico. |
| `/api/usuarios/` | CRUD | Administração de usuários. |
| `/api/regioes/` | CRUD | Regiões. |
| `/api/imoveis/` | CRUD | Imóveis, com escopo. |
| `/api/dispositivos/` | CRUD | Dispositivos; chave só é recebida, nunca retornada. |
| `/api/acessos-regiao/` | CRUD | Vínculos de região. |
| `/api/auditoria/` | GET | Auditoria administrativa. |

`AuditLog` é imutável. Login, logout e mudanças críticas registram ator, ação, recurso, detalhes e data.

## Etapa 3 — monitoramento

### Modelo e serviço

`monitoring.Reading` armazena dispositivo, UUID externo, instante medido, volume acumulado, consumo incremental e instante de recebimento.

O serviço `registrar_leitura()` é transacional e:

1. rejeita instante futuro ou volume negativo;
2. é idempotente por `device + external_id`;
3. bloqueia o dispositivo na transação;
4. bloqueia leituras fora de ordem cronológica e volume acumulado regressivo;
5. calcula consumo pela diferença de volume;
6. atualiza `Device.last_reading_at`;
7. dispara a avaliação de alertas após criação.

### API e simulador

| Endpoint | Método | Acesso |
| --- | --- | --- |
| `/api/leituras/` | POST | Dispositivo, por `X-Device-Key`. |
| `/api/dashboard/` | GET | Sessão autenticada e escopo. |
| `/api/imoveis/{id}/leituras/` | GET | Sessão com acesso ao imóvel. |
| `/api/imoveis/{id}/consumo/` | GET | Sessão com acesso ao imóvel. |

O comando `simulate_readings` cria leituras crescentes pelo mesmo serviço da API:

```powershell
.\venv\Scripts\python.exe manage.py simulate_readings HIDRO-001 --count 24 --start-volume 100.000 --increment 0.100 --interval-minutes 60
```

## Etapa 4 — operação

### Alertas

- Regras puras estão em `alerts/rules.py`.
- A regra atual detecta consumo incremental maior ou igual a `ALERT_CONSUMPTION_THRESHOLD`, padrão `10.000` m³.
- O engine cria ou atualiza um único alerta aberto por dispositivo e regra, aumentando `occurrences_count` sem duplicação.
- `POST /api/alertas/{id}/reconhecer/` registra usuário, data e auditoria.

### Ocorrências, ordens e solicitações

| Domínio | Regras/rotas |
| --- | --- |
| Ocorrências | `GET/POST /api/ocorrencias/`; histórico em `GET/POST /api/ocorrencias/{id}/atualizacoes/`; transições abertas → em andamento → resolvidas. |
| Ordens | `GET/POST /api/ordens-servico/`; status em `POST /api/ordens-servico/{id}/status/`; ordem é vinculada à ocorrência e pode ser atribuída somente a técnico. |
| Solicitações | `GET/POST /api/solicitacoes/`; status em `POST /api/solicitacoes/{id}/status/`; morador cria somente para imóvel próprio; conclusão exige resolução. |

Técnicos, operadores e administradores atuam somente no escopo regional. Técnicos visualizam apenas ordens atribuídas a eles dentro desse escopo.

## Etapa 5 — válvulas e relatórios

### Controle de válvula

O app `control` introduz `ValveCommand`. O serviço executa uma única transação para criar o comando, mudar `Device.valve_state` e registrar `valve.commanded` na auditoria.

| Endpoint | Método | Acesso |
| --- | --- | --- |
| `/api/dispositivos/{id}/valvula/` | GET | Qualquer usuário autenticado no escopo. |
| `/api/dispositivos/{id}/valvula/` | POST | Técnico, operador ou administrador. |

O corpo do POST exige `action` (`open` ou `close`) e `reason`. O frontend deverá manter uma confirmação explícita antes desse POST.

### Relatórios

Endpoint:

```text
GET /api/relatorios/{tipo}/?formato=csv|pdf
```

Tipos suportados: `consumo`, `leituras`, `alertas` e `ocorrencias`. Filtros opcionais: `imovel`, `regiao`, `inicio`, `fim` e `status`.

- CSV é entregue em streaming.
- PDF é produzido com ReportLab e entregue como anexo.
- O escopo é aplicado antes de montar querysets e cada exportação registra `report.exported` na auditoria.

## Migrations e validações

Migrations iniciais foram criadas para `accounts`, `hidroscan`, `monitoring`, `alerts`, `occurrences`, `workorders`, `resident_requests` e `control`.

Elas não foram aplicadas ao `db.sqlite3` local. Os testes aplicaram migrations apenas em banco temporário. A criação real das tabelas exige autorização específica e:

```powershell
.\venv\Scripts\python.exe manage.py migrate
```

Validações executadas ao fim da etapa 5:

- 20 testes de API e serviço aprovados;
- `manage.py check` sem problemas;
- validação OpenAPI sem erros ou avisos;
- `makemigrations --check --dry-run` sem mudanças pendentes;
- diff sem erro de whitespace.

O aviso do WhiteNoise sobre ausência de `staticfiles/` não bloqueia testes. Esse diretório será gerado por `collectstatic` na entrega/produção.

## Etapa 6 — integração React ↔ Django

### Objetivo

Eliminar autenticação e dados simulados do frontend, mantendo os componentes visuais que já existem. O React passará a consumir a API autenticada e mostrará carregamento, vazio e erros de forma explícita.

### Escopo técnico

1. Configurar proxy `/api` em `frontend/vite.config.ts` para Django em desenvolvimento.
2. Criar cliente HTTP com `fetch`, JSON, `credentials: 'include'`, CSRF, normalização de erros e download de `Blob`.
3. Integrar `AuthContext.tsx` a CSRF, login, logout e `me`.
4. Substituir dados em `frontend/src/data/` progressivamente por consultas reais.
5. Atualizar cabeçalho/menu com usuário e perfil reais.
6. Adicionar estados de carregamento, vazio, erro e polling de dashboard.
7. Validar build TypeScript/Vite e fluxos ponta a ponta.

### Cliente HTTP e CSRF

Arquivos previstos, respeitando a estrutura atual:

```text
frontend/src/api/client.ts
frontend/src/api/auth.ts
frontend/src/api/monitoring.ts
frontend/src/api/operations.ts
frontend/src/api/reports.ts
frontend/src/api/types.ts
```

O cliente comum deverá:

- chamar `GET /api/auth/csrf/` antes do primeiro login ou método de escrita;
- enviar cookie com `credentials: 'include'`;
- extrair `csrftoken` e enviar `X-CSRFToken` em POST, PUT, PATCH e DELETE;
- converter `detail` da API em erro apresentado pela interface;
- tratar `401` como sessão ausente e `403` como falta de permissão;
- fazer downloads CSV/PDF como `Blob`;
- nunca colocar senha, sessão, CSRF persistente ou chave de dispositivo no `localStorage`.

O proxy Vite evita CORS no MVP: o navegador usa caminhos relativos `/api/*`, enquanto o Vite encaminha para Django local.

### Autenticação real

`AuthContext.tsx` será modificado para remover `demoUsers` e:

1. consultar `/api/auth/me/` ao iniciar;
2. manter `isLoading` até a checagem de sessão terminar;
3. chamar `/api/auth/login/` após obter CSRF;
4. chamar `/api/auth/logout/` e limpar estado local;
5. fornecer dados reais para `Header` e `NavigationMenu`.

O comportamento evita um flash da tela de login durante restauração de sessão válida.

### Ordem de integração de telas

| Bloco | Arquivos/telas | API principal |
| --- | --- | --- |
| Sessão e shell | `AuthContext`, `App`, `Header`, `MainLayout`, menu | `/api/auth/csrf/`, login, logout, me. |
| Monitoramento | `MonitoringPage`, visão geral, consumo e histórico | dashboard, leituras e consumo por imóvel. |
| Operação técnica | alertas, ordens, equipamentos e histórico técnico | alertas, ordens, dispositivos, válvula, ocorrências. |
| Morador | solicitações e conta | solicitações e me. |
| Exportação | páginas com filtros/dados exportáveis | relatórios CSV/PDF. |

`ResidentNoticesPage` continuará demonstrativa até que exista model/endpoint de comunicados; a etapa 6 não criará funcionalidade inexistente no backend.

### Monitoramento e polling

O dashboard chamará `/api/dashboard/` e as consultas associadas somente enquanto a tela estiver montada e a sessão existir. A primeira configuração proposta é intervalo de 30 segundos; o valor será centralizado e poderá ser ajustado sem alterar cada página.

### Mapeamento de ações de interface

| Ação visual | Requisição |
| --- | --- |
| Reconhecer alerta | `POST /api/alertas/{id}/reconhecer/` |
| Alterar ordem | `POST /api/ordens-servico/{id}/status/` |
| Criar solicitação | `POST /api/solicitacoes/` |
| Atualizar solicitação | `POST /api/solicitacoes/{id}/status/` |
| Comandar válvula | `POST /api/dispositivos/{id}/valvula/` com confirmação prévia |
| Baixar relatório | `GET /api/relatorios/{tipo}/?formato=csv|pdf` |

### Estados obrigatórios de UX

Cada tela integrada deve ter carregamento inicial, lista vazia, erro recuperável e dados reais. Uma falha não poderá ser encoberta por mocks. Recurso fora do escopo (`404`) será exibido como indisponível, sem tentar inferir se existe em outra região.

### Pré-requisitos para visualização local

Após autorização para criar as tabelas e dados mínimos:

```powershell
# Banco e primeiro administrador
.\venv\Scripts\python.exe manage.py migrate
.\venv\Scripts\python.exe manage.py createsuperuser

# Terminal 1: backend
.\venv\Scripts\python.exe manage.py runserver

# Terminal 2: frontend
cd frontend
npm install
npm run dev
```

O backend será normalmente `http://127.0.0.1:8000`; o Vite informará a URL do frontend, geralmente `http://localhost:5173`.

### Critérios de aceite da etapa 6

1. Login, restauração de sessão e logout funcionam contra Django.
2. Header e menu refletem o perfil retornado pela API.
3. Dashboard, consumo, leituras, alertas, ordens e solicitações exibem dados reais.
4. Ações operacionais tratam erros e atualizam a tela a partir da resposta do servidor.
5. Downloads CSV/PDF funcionam autenticados.
6. `npm run build` passa.
7. Nenhuma tela integrada usa dados simulados como fallback silencioso.

## Etapa 7 — entrega local e preparação de produção

### Objetivo

Transformar a aplicação integrada da etapa 6 em uma entrega executável de forma reproduzível: Django deve servir o build do React, rotas da SPA precisam funcionar ao recarregar a página e a configuração de produção precisa evitar defaults inseguros.

Esta etapa não substitui uma infraestrutura de hospedagem. Ela deixa o repositório pronto para ser publicado em um ambiente definido posteriormente.

### 7.1 — Build e publicação do frontend

Arquivos previstos:

```text
frontend/vite.config.ts
setup/settings/base.py
setup/settings/prod.py
setup/urls.py
templates/…
```

Implementações planejadas:

1. Executar `npm run build` e gerar `frontend/dist/`.
2. Configurar a localização do build no Django.
3. Usar WhiteNoise para servir assets estáticos versionados.
4. Criar fallback de SPA que devolve `index.html` apenas para rotas do React que não começam com `/api/`, `/admin/` ou `/static/`.
5. Preservar rotas da API antes do fallback para impedir que um endpoint inexistente retorne HTML da SPA.
6. Executar `collectstatic` no ambiente de produção e confirmar que os assets possuem hash e são carregados pelo `index.html`.

### 7.2 — Configuração por ambiente

O `.env.example` continuará sendo somente um modelo versionado. O `.env` real fica fora do Git.

Variáveis que devem ser revisadas para produção:

| Variável | Desenvolvimento | Produção |
| --- | --- | --- |
| `SECRET_KEY` | Chave local exclusiva. | Chave forte, secreta e fornecida pela plataforma. |
| `DEBUG` | `True` enquanto desenvolve. | `False`. |
| `ALLOWED_HOSTS` | `localhost,127.0.0.1`. | Domínios/IPs reais da aplicação. |
| `EMAIL_BACKEND` | Backend de console. | Backend SMTP ou serviço de e-mail aprovado. |
| `DEFAULT_FROM_EMAIL` | Endereço local. | Remetente válido do domínio. |
| `TIME_ZONE` | `UTC`. | Mantido em `UTC` no backend. |
| `ALERT_CONSUMPTION_THRESHOLD` | `10.000`, salvo ajuste. | Valor validado pelo negócio. |

Também serão definidos, em `prod.py`, parâmetros de segurança proporcionais ao ambiente HTTPS, como cookies seguros de sessão/CSRF, `SECURE_SSL_REDIRECT` quando houver proxy TLS confiável e headers de segurança. Esses valores dependem da infraestrutura e não devem ser habilitados cegamente em desenvolvimento local.

### 7.3 — Banco SQLite e continuidade operacional

SQLite continua adequado ao MVP se houver baixa concorrência de escrita. A entrega deverá incluir:

1. diretório persistente com permissão de leitura e escrita para o processo Django;
2. política de backup do arquivo `db.sqlite3` com retenção e teste de restauração;
3. execução de `manage.py migrate` antes da primeira inicialização da versão;
4. proibição de compartilhar o mesmo arquivo SQLite entre múltiplas instâncias independentes do aplicativo;
5. indicador de reavaliação para banco servidor quando múltiplas gravações concorrentes se tornarem frequentes.

Não será adicionado um banco diferente nesta etapa sem decisão arquitetural e migração planejada.

### 7.4 — Dados mínimos demonstráveis

Antes da demonstração integrada, a base local deverá ter:

- migrations aplicadas;
- administrador inicial;
- pelo menos uma região, imóvel, morador e dispositivo;
- vínculo regional para operador/técnico, quando usado;
- leituras históricas criadas com `simulate_readings` ou por ingestão autenticada;
- ao menos um alerta/ocorrência/ordem ou solicitação para validar telas operacionais.

Será avaliado criar um comando `seed_demo` idempotente. Ele só será implementado se os dados demonstrativos e as credenciais forem aprovados, pois cria registros persistentes no banco local.

### 7.5 — Critérios de aceite da etapa 7

1. `npm run build` conclui sem erros.
2. `collectstatic --noinput` conclui sem arquivos ausentes.
3. Django serve a SPA construída e seus assets.
4. Recarregar uma rota interna do React não produz `404`.
5. `/api/*`, `/api/docs/` e `/admin/` permanecem atendidos pelo Django, sem fallback HTML incorreto.
6. Com `DEBUG=False`, `check --deploy` não apresenta falhas críticas não tratadas.
7. Uma cópia de backup SQLite pode ser restaurada em ambiente local de validação.

## Etapa 8 — homologação e encerramento técnico

### Objetivo

Executar a validação final de negócio e registrar qualquer item deliberadamente adiado. Esta etapa não cria escopo funcional novo; ela mede a entrega contra os fluxos já implementados.

### Matriz de homologação

| Fluxo | Evidência esperada |
| --- | --- |
| Sessão | Login, restauração após recarregar, logout e proteção CSRF. |
| Técnico | Cadastro, verificação de e-mail, bloqueio antes de verificar e liberação após código válido. |
| Escopo | Morador não visualiza imóvel alheio; equipe vê apenas regiões autorizadas; administrador vê todos. |
| Leitura | Dispositivo autorizado recebe `201`; repetição recebe `200`; leituras inválidas recebem `400`; chave inválida recebe `401`. |
| Alertas | Pico cria alerta; novas detecções atualizam o mesmo alerta aberto; reconhecimento registra auditoria. |
| Ocorrências/ordens | Transições válidas funcionam; transições inválidas retornam erro; técnico só manipula ordem atribuída e visível. |
| Solicitações | Morador cria para imóvel próprio; equipe altera status; conclusão exige resolução. |
| Válvula | Leitura do estado respeita escopo; comando exige perfil operacional, motivo e auditoria. |
| Relatórios | CSV/PDF respeitam filtros e escopo; exportação aparece em auditoria. |
| Frontend | Telas integradas não voltam para mocks quando API falha; carregamento, vazio e erro são visíveis. |

### Qualidade e documentação de encerramento

Itens a executar:

1. Rodar toda a suíte Django, checagem de migrations e validação OpenAPI.
2. Rodar lint e build do frontend.
3. Registrar versões de Python, Node, Django e dependências utilizadas.
4. Revisar `.gitignore` para confirmar exclusão de `.env`, `db.sqlite3`, `staticfiles/`, ambientes virtuais e artefatos de build não desejados.
5. Atualizar este documento com o resultado das etapas 6 a 8 e com desvios aprovados.
6. Preparar lista de limitações conhecidas para apresentação: SQLite, polling em vez de WebSocket, ausência de comunicados persistidos e ausência de integração com hardware físico.

### Critério de encerramento do projeto

O projeto poderá ser considerado finalizado quando as etapas 6, 7 e 8 estiverem aceitas, não houver migrations pendentes, a suíte de testes e o build do frontend estiverem verdes, o fluxo demonstrável estiver documentado e os itens adiados estiverem registrados como decisões conscientes.

## Sequência recomendada de execução

```text
Etapa 6 — integrar React à API e validar no navegador
    ↓
Etapa 7 — construir SPA, servir pelo Django e preparar operação local/produção
    ↓
Etapa 8 — homologar fluxos completos, documentar limitações e encerrar
```

Cada etapa que modificar código, dependências, migrations, variáveis de ambiente ou dados persistentes requer autorização explícita antes de ser iniciada.
