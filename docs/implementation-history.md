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

### Configuração de ambiente

A sintaxe pendente de `SECRET_KEY` no `.env` foi corrigida manualmente na etapa 1. O backend agora pode ler a variável com `django-environ` no formato `CHAVE=valor`.

O `.env.example` continua sendo o modelo versionado de variáveis suportadas. No ambiente local, apenas `SECRET_KEY` é obrigatória no código atual; `DEBUG`, `ALLOWED_HOSTS`, `TIME_ZONE`, `EMAIL_BACKEND`, `DEFAULT_FROM_EMAIL` e `ALERT_CONSUMPTION_THRESHOLD` possuem valores padrão, mas devem ser declarados explicitamente no `.env` de cada ambiente para tornar o comportamento previsível.

### Resultado técnico da etapa

- `manage.py`, WSGI e ASGI selecionam settings de desenvolvimento de forma explícita.
- `base.py` concentra configurações comuns, `dev.py` mantém `DEBUG=True` e `prod.py` inicia com `DEBUG=False`.
- A conexão é sempre `django.db.backends.sqlite3`, com arquivo em `BASE_DIR / db.sqlite3`.
- O middleware contém sessão, CSRF, autenticação Django e WhiteNoise na ordem necessária para autenticação web e arquivos estáticos.
- O DRF usa `SessionAuthentication`, paginação por página e `IsAuthenticated` como permissão padrão.
- `/api/schema/` e `/api/docs/` usam `SERVE_PERMISSIONS = IsAuthenticated`; isso substitui o padrão `AllowAny` do drf-spectacular e evita expor a descrição dos endpoints anonimamente.
- `USE_TZ=True` e UTC são adotados no backend; a conversão para horário de Recife será responsabilidade do frontend.

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

### Fluxos internos implementados

#### Cadastro administrativo de usuário

1. Um administrador envia e-mail, senha, nome opcional, perfil e `todas_regioes` para `/api/usuarios/`.
2. `UserCreateSerializer` exige senha com ao menos oito caracteres e `role` explícito.
3. O serviço usa os hashers do Django; senha nunca é retornada nem armazenada em texto puro.
4. Para morador, operador e administrador, `email_verificado` é marcado como verdadeiro no serviço. Para técnico, é criado código de verificação com hash, expiração de cinco minutos e contador zerado.
5. A criação é auditada com o administrador autenticado como `actor` e o novo usuário como recurso afetado.

#### Verificação de técnico

1. O técnico recebe um código numérico por e-mail — console em desenvolvimento, SMTP quando configurado para produção.
2. Sem sessão, o cliente obtém CSRF em `/api/auth/csrf/` e envia `email + code` para `/api/auth/verificacao-email/`.
3. O serviço bloqueia a linha de verificação durante a conferência, impede código usado, vencido ou com cinco tentativas anteriores.
4. Cada código incorreto incrementa e persiste `attempts`; após a quinta falha, inclusive um código correto é recusado até o reenvio de novo código.
5. Código válido marca a verificação como usada, atualiza `email_verificado=True` e gera evento auditado `user.email_verified`.
6. As respostas inválidas são genéricas, para não revelar se um e-mail possui código pendente.

#### Dispositivos e chaves

1. Administrador cria dispositivo com imóvel, nome, número de série, `device_key` e, opcionalmente, `active`.
2. A chave recebida é transformada em hash por `Device.set_device_key()`; a API nunca devolve a chave original.
3. `valve_state` não pode ser definido por cadastro/edição genérica. Ele só muda pelo serviço de comando da válvula, que exige motivo e auditoria.
4. A criação do dispositivo e sua auditoria ocorrem na mesma transação.

### Ajustes e resolução das pendências da etapa 2

- **Reenvio de código de verificação**: implementado endpoint `POST /api/auth/reenvio-verificacao/` acessível por administrador autenticado, permitindo emitir novo código para técnicos não verificados, com cooldown de 60 segundos entre reenvios e auditoria da ação (`user.verification_resent`).
- **Throttling e proteção contra spoofing**: adicionado `VerificationRateThrottle` limitando em 10 requisições por minuto por IP no endpoint público de conferência de código e configurado `NUM_PROXIES` em `REST_FRAMEWORK` (padrão 0 em desenvolvimento para uso direto de `REMOTE_ADDR`), impedindo contorno de throttle por forjamento de cabeçalho `X-Forwarded-For`.
- **Normalização e tratamento de e-mail**: padronizado o salvamento de e-mails em caixa baixa tanto em `clean()` e `save()` no model `User`, quanto em `LoginSerializer`, `UserCreateSerializer`, `UserSerializer` e `authenticate_user`. Criada migração de dados `accounts.0002_normalize_existing_emails` com detecção proativa e bloqueio com mensagem detalhada em caso de colisões prévias. A validação de e-mail na API rejeita duplicidades case-insensitive com `400 Bad Request` antes do banco, prevenindo `IntegrityError` (500).
- **Unificação de constantes de verificação**: `VERIFICATION_TTL` centralizado em `accounts.models` e reutilizado em `services.py` (`send_verification_code` e `resend_verification_code`) e `verification_expiry`.
- **Formulários e operações no Django Admin**:
  - `UserAdmin` agora conta com `UserCreationForm` e `UserChangeForm` dedicados, adaptados ao modelo sem `username` e com campos `password_confirm`, `role` e `todas_regioes`. O formulário de edição inclui link funcional `<a href="../password/">` para alteração de senha.
  - Novos usuários criados no Admin recebem `email_verificado=True` automaticamente, com exceção de técnicos, que recebem código de verificação disparado no cadastro.
  - `DeviceAdmin` possui `DeviceAdminForm` com campo seguro para inserção/redefinição de chave (`device_key`), gerando o hash correto no salvamento.
  - Sobrescrito `delete_queryset` em todos os `ModelAdmin`s para garantir auditoria em exclusões em massa, e operações de salvamento/exclusão envolvidas em `transaction.atomic()` para evitar registros órfãos de auditoria caso ocorra falha de banco.
- **Configuração de Proxy e Throttle**: `.env.example` atualizado documentando `NUM_PROXIES` para ambientes atrás de proxy reverso e direto.
- **Cobertura de Testes**: suíte de `accounts` expandida para 25 testes (cobrindo formulários de criação/edição do Admin, detecção de colisão na migração, fieldsets, validações de senha, bloqueio de throttle mesmo com falsificação de `X-Forwarded-For` e duplicidades case-insensitive na API), totalizando 43 testes automatizados 100% aprovados em todo o projeto.
- **Link "Esqueceu a senha?"**: removido do formulário de login no frontend React para não induzir fluxo inexistente antes de sua especificação.
- **Registro no Django Admin com auditoria**: criados registros de models em `accounts/admin.py` e `hidroscan/admin.py` com auditoria em `save_model`, `delete_model` e `delete_queryset`.

### Pendências e decisões ainda abertas da etapa 2

- Recuperação/troca de senha permanece a ser especificada e aprovada quando requerida.
- Auditoria de operações efetuadas diretamente via shell Django continua sem interceptação (limitação de baixo nível/ORM sem signals globais).
- Esgotamento de tentativas de técnicos por terceiros via endpoint público permanece como decisão de desenho mitigada por throttle de IP e desbloqueio/reenvio por administrador autenticado.
- Dependência conceitual entre apps: `accounts.views` consome `hidroscan.services.register_audit`, enquanto `hidroscan` referencia o model de usuário; desacoplamento estrito poderá ser feito via módulo base em etapa futura se desejado.

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

### Respostas e regras de ingestão

- `201 Created`: leitura nova persistida.
- `200 OK`: mesmo `external_id` recebido novamente para o mesmo dispositivo; não cria duplicata.
- `400 Bad Request`: payload inválido, data futura, leitura fora de ordem, volume negativo ou regressivo.
- `401 Unauthorized`: chave ausente ou inválida.

O cálculo de consumo parte de zero para a primeira leitura do dispositivo. Cada leitura posterior guarda a diferença já calculada, permitindo consultas e relatórios sem recalcular toda a série em cada requisição.

### Pendências e decisões ainda abertas da etapa 3

- O simulador gera somente leituras históricas crescentes; não há cenários prontos para falha de comunicação, bateria ou pressão, porque esses atributos não fazem parte do model atual de `Device`.
- O dashboard atual retorna resumo agregado de imóveis, dispositivos, consumo diário e última leitura. Definições adicionais de KPIs e granularidade de gráficos deverão ser confirmadas durante a integração visual.
- Não existe retenção/arquivamento de leituras nem política de volume de dados. Isso deve ser reavaliado antes de cargas prolongadas de sensores reais.

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

### Detalhes dos estados operacionais

| Entidade | Estados implementados | Transições aceitas |
| --- | --- | --- |
| Alerta | `open`, `acknowledged`, `resolved` | Reconhecimento transforma aberto em reconhecido; alerta resolvido não pode ser reconhecido. |
| Ocorrência | `open`, `in_progress`, `resolved` | Aberta → em andamento/resolvida; em andamento → resolvida. |
| Ordem | `pending`, `in_progress`, `completed`, `canceled` | Pendente → em andamento/cancelada; em andamento → concluída/cancelada. |
| Solicitação | `open`, `under_review`, `completed`, `canceled` | Aberta → em análise/cancelada; em análise → concluída/cancelada. |

Toda transição validada cria auditoria. A atualização de ocorrência também registra uma linha em `OccurrenceUpdate`, preservando o histórico textual e o status aplicado.

### Pendências e decisões ainda abertas da etapa 4

- A regra de alerta atual cobre somente pico de consumo. Limiar, severidade e regras adicionais — vazamento contínuo, ausência de comunicação ou pressão — dependem de requisitos e dados de sensor que ainda não existem no schema.
- Não há ação formal de resolver alerta nem ligação automática de alerta para ocorrência. A criação de ocorrência a partir de alerta permanece uma ação explícita para evitar automações indevidas.
- Não há comentários/anexos em ordens de serviço, agenda de técnico ou notificação ao morador. Esses itens não devem ser inferidos a partir das telas demonstrativas.
- O frontend contém telas com dados técnicos simulados de equipamentos e intervenções; os campos correspondentes ainda não possuem modelos dedicados.

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

### Detalhes de controle de válvula

- `GET` retorna o estado conhecido persistido: `open`, `closed` ou `unknown`.
- `POST` bloqueia o dispositivo na transação, cria `ValveCommand`, muda o estado persistido e registra `valve.commanded`.
- A implementação representa o estado aceito pelo software. Ainda não existe protocolo de confirmação com hardware físico; portanto, “aplicado” significa que o comando foi gravado e o estado lógico foi atualizado, não que uma válvula remota confirmou a execução.

### Pendências e decisões ainda abertas da etapa 5

- Integração com controlador/hardware de válvula não está implementada. Será necessário definir protocolo, timeout, confirmação, reenvio, estados de falha e reconciliação do estado físico.
- PDFs utilizam layout textual simples. Identidade visual, cabeçalho institucional, paginação avançada e tabelas extensas podem exigir um template aprovado.
- Relatórios atuais não incluem ordens de serviço ou solicitações. A inclusão depende de confirmar necessidade, filtros e campos permitidos por perfil.
- Não há fila assíncrona para relatórios grandes. Para o MVP, exportações são síncronas; volumes elevados devem motivar processamento assíncrono.

## Migrations e validações

Migrations iniciais foram criadas para `accounts`, `hidroscan`, `monitoring`, `alerts`, `occurrences`, `workorders`, `resident_requests` e `control`.

Elas não foram aplicadas ao `db.sqlite3` local. Os testes aplicaram migrations apenas em banco temporário. A criação real das tabelas exige autorização específica e:

```powershell
.\venv\Scripts\python.exe manage.py migrate
```

Validações executadas após as correções posteriores à etapa 5:

- 25 testes de API e serviço aprovados;
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

Para uma demonstração prática após a etapa 6, será necessário aplicar as migrations e criar dados persistentes. Essas operações ainda exigem autorização específica porque alteram o `db.sqlite3` local.

#### Preparação inicial, executada uma única vez

```powershell
# No diretório raiz do projeto: C:\Users\USUARIO\Documents\GlauberProgramacao\Hidroscan

# 1. Cria/atualiza as tabelas SQLite pelas migrations versionadas.
.\venv\Scripts\python.exe manage.py migrate

# 2. Cria o primeiro administrador. O comando solicitará e-mail e senha.
.\venv\Scripts\python.exe manage.py createsuperuser

# 3. Instala dependências do frontend se node_modules ainda não existir.
Set-Location frontend
npm install
Set-Location ..
```

O superusuário criado pelo manager customizado recebe o perfil `administrador`. Ele permite autenticar na aplicação; porém, sem região, imóvel e dispositivo, o dashboard mostrará estado vazio/zero, o que é esperado.

#### Execução para visualizar backend e frontend

Abra **dois terminais** no diretório raiz do projeto.

**Terminal 1 — Django/API**

```powershell
.\venv\Scripts\python.exe manage.py runserver 127.0.0.1:8000
```

Resultados esperados:

- API em `http://127.0.0.1:8000/api/`;
- documentação autenticada em `http://127.0.0.1:8000/api/docs/`;
- admin Django em `http://127.0.0.1:8000/admin/`, quando seus models estiverem registrados;
- terminal exibindo requisições e erros do backend.

**Terminal 2 — Vite/React**

```powershell
Set-Location frontend
npm run dev
```

O Vite deverá exibir uma URL semelhante a:

```text
Local: http://localhost:5173/
```

Abra **`http://localhost:5173/` no navegador**. A interface React será carregada nessa URL. Após a integração da etapa 6, o login usará a API do Terminal 1 por meio do proxy `/api`; assim, os gráficos, listas e dashboard virão do Django, e não dos arquivos de dados simulados.

#### Dados para enxergar conteúdo real

Para visualizar mais do que a tela de login ou estados vazios, serão necessários dados mínimos: região, morador, imóvel, dispositivo, acesso regional e leituras. No estado atual, o projeto não possui `seed_demo` aprovado e os models de domínio ainda não foram registrados no Django Admin. Portanto, há uma pendência operacional: definir e autorizar uma das alternativas abaixo antes da demonstração completa.

1. criar um comando idempotente `seed_demo`, com dados e credenciais de demonstração aprovados;
2. registrar models no Django Admin e cadastrar dados manualmente;
3. criar os dados por chamadas autenticadas da API/documentação.

Depois de existir um dispositivo ativo, o comando abaixo pode preencher histórico de consumo:

```powershell
.\venv\Scripts\python.exe manage.py simulate_readings HIDRO-001 --count 24 --start-volume 100.000 --increment 0.100 --interval-minutes 60
```

`HIDRO-001` deve ser substituído pelo número de série real. Sem dados iniciais, o comando falhará corretamente informando que o dispositivo não foi encontrado.

### Sequência visual prevista na etapa 6

1. Abrir `http://localhost:5173/` no navegador.
2. O `AuthContext` chama `/api/auth/me/`; sem sessão, a tela de login é exibida sem erro técnico.
3. Ao enviar e-mail/senha, o cliente busca CSRF, envia login e recebe cookie de sessão do Django.
4. Após autenticar, cabeçalho e menu passam a refletir o perfil retornado (`morador`, `operador`, `tecnico` ou `administrador`).
5. A tela inicial chama o dashboard e demais endpoints do perfil. Enquanto a API responde, a interface exibe carregamento; sem registros, exibe estado vazio; com falha, exibe mensagem recuperável.
6. Para acompanhar o backend, manter o Terminal 1 aberto: cada requisição do frontend aparecerá nos logs do `runserver`.
7. Para conferir contrato e respostas manualmente, autenticar-se no frontend e abrir `/api/docs/` na mesma origem do Django, ou usar as ferramentas do navegador para inspecionar Network/Fetch.

### Critérios de aceite da etapa 6

1. Login, restauração de sessão e logout funcionam contra Django.
2. Header e menu refletem o perfil retornado pela API.
3. Dashboard, consumo, leituras, alertas, ordens e solicitações exibem dados reais.
4. Ações operacionais tratam erros e atualizam a tela a partir da resposta do servidor.
5. Downloads CSV/PDF funcionam autenticados.
6. `npm run build` passa.
7. Nenhuma tela integrada usa dados simulados como fallback silencioso.

### Pendências, riscos e dúvidas que exigem decisão na etapa 6

| Tema | Situação atual | Decisão necessária |
| --- | --- | --- |
| Seleção de imóvel | Algumas telas assumem um único imóvel, mas o backend permite vários imóveis visíveis. | Definir seletor global de imóvel ou regra de imóvel padrão. |
| Operador no frontend | Menu atual possui páginas parcialmente demonstrativas. | Confirmar quais telas de operador devem ser integradas primeiro. |
| Comunicados | `ResidentNoticesPage` não tem model/endpoint. | Manter demonstrativa ou aprovar novo domínio. |
| Perfil e conta | A tela sugere edição de conta; não há endpoint seguro de autoedição definido. | Aprovar escopo de atualização de perfil/senha ou mantê-la somente leitura. |
| Gráficos | A API entrega agregados e leituras; a interface atual possui séries demonstrativas. | Confirmar períodos, unidades e indicadores necessários para cada gráfico. |
| Polling | Proposta inicial: 30 segundos no dashboard. | Confirmar intervalo aceitável e quais páginas devem atualizar automaticamente. |
| Chave de dispositivo | É segredo de integração, não dado de usuário web. | Confirmar que nenhuma tela React exibirá ou permitirá copiar a chave. |

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

#### Teste prático previsto da entrega

Após a implementação, a validação local deverá ocorrer em três fases:

```powershell
# 1. Gera frontend/dist
Set-Location frontend
npm run build
Set-Location ..

# 2. Reúne arquivos estáticos do Django/WhiteNoise
.\venv\Scripts\python.exe manage.py collectstatic --noinput

# 3. Executa Django, que deverá servir frontend/dist e a API
.\venv\Scripts\python.exe manage.py runserver 127.0.0.1:8000
```

No navegador, acessar `http://127.0.0.1:8000/`. Diferentemente da etapa 6, não será necessário iniciar o Vite para testar o build final. Também serão testadas manualmente uma rota interna da SPA, como uma tela de dashboard, e uma rota de API inválida, para confirmar que o fallback entrega `index.html` apenas para a interface React e não mascara erros da API.

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

### 7.4 — Pendências e dúvidas de infraestrutura

| Tema | Dúvida pendente | Impacto se não for definido |
| --- | --- | --- |
| Hospedagem | Onde Django será executado: máquina local, VPS, PaaS ou servidor institucional? | Não é possível concluir configuração de processo, domínio e persistência. |
| HTTPS | Haverá proxy reverso/TLS confiável? | Cookies `Secure` e redirecionamento HTTPS não podem ser habilitados com segurança. |
| Domínio | Qual domínio e subdomínio serão usados? | `ALLOWED_HOSTS`, cookies e remetente de e-mail permanecem genéricos. |
| E-mail | Qual provedor SMTP/serviço e quais credenciais serão utilizados? | Verificação de técnico só funciona em console, não entrega mensagens reais. |
| Backup | Onde e com qual frequência guardar backup do SQLite? | Risco de perda de dados operacionais. |
| Execução | Uma ou várias instâncias Django serão necessárias? | SQLite não deve ser compartilhado por múltiplas instâncias concorrentes. |
| Observabilidade | Onde registrar logs e erros de produção? | Diagnóstico de falhas fica restrito ao console do processo. |

### 7.5 — Dados mínimos demonstráveis

Antes da demonstração integrada, a base local deverá ter:

- migrations aplicadas;
- administrador inicial;
- pelo menos uma região, imóvel, morador e dispositivo;
- vínculo regional para operador/técnico, quando usado;
- leituras históricas criadas com `simulate_readings` ou por ingestão autenticada;
- ao menos um alerta/ocorrência/ordem ou solicitação para validar telas operacionais.

Será avaliado criar um comando `seed_demo` idempotente. Ele só será implementado se os dados demonstrativos e as credenciais forem aprovados, pois cria registros persistentes no banco local.

### 7.6 — Critérios de aceite da etapa 7

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

### Pendências que não devem ser ocultadas no encerramento

- O estado de válvula é lógico; não existe confirmação de hardware real.
- A única regra de anomalia atual é pico de consumo; demais tipos de alerta requerem dados e parâmetros aprovados.
- Comunicados do morador não possuem domínio persistido.
- Recuperação de senha, reenvio de código de técnico e autoedição de perfil não possuem fluxos aprovados.
- O dashboard será baseado em polling, não WebSocket.
- SQLite é apropriado ao MVP, mas deve ser reavaliado para alta concorrência de escrita ou múltiplas instâncias.
- Relatórios grandes ainda são síncronos e podem exigir fila assíncrona no futuro.
- Interface administrativa para cadastrar dados demonstrativos ainda depende de decisão entre Django Admin e `seed_demo`.

### Evidências de homologação a registrar

Para cada item da matriz, a homologação deverá registrar data, ambiente, perfil utilizado, resultado, evidência (captura de tela ou resposta relevante) e pendência encontrada. Um erro crítico não deve ser compensado apenas por teste unitário verde: o fluxo deve funcionar com sessão, banco e frontend reais.

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
