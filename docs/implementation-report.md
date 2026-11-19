# Relatório Consolidado de Implementação — Etapas 1 a 5

**Aplicação:** Hidroscan — Sistema de Telemetria e Gestão de Consumo Hídrico  
**Documento Base:** `docs/implementation-history.md`  
**Escopo do Relatório:** Etapas 1 a 5 (Fundação, Usuários/Escopo/Cadastros, Monitoramento, Operação, Controle de Válvulas e Relatórios)  
**Papel:** Analista de Sistemas Sênior  
**Status da Versão:** Backend funcional e validado por testes automatizados (85 testes aprovados)  

---

## 1. Visão Geral

O **Hidroscan** é uma solução voltada ao monitoramento contínuo de consumo hídrico, telemetria de hidrômetros, detecção automatizada de anomalias, suporte a processos operacionais (ocorrências, ordens de serviço, solicitações de moradores) e governança por meio de trilha de auditoria e controle de acessos segregado.

Durante as **Etapas 1 a 5**, o projeto teve seu núcleo de backend integralmente reestruturado, desenvolvido e homologado sobre uma arquitetura monolítica Django com Django REST Framework (DRF), persistência local padronizada em SQLite e documentação OpenAPI interativa. Toda a camada de negócios, controle de transações, políticas de integridade de dados e proteção contra acessos indevidos foram concebidas e testadas no backend, preparando o ecossistema para a posterior integração com a interface SPA (React/Vite).

O desenvolvimento das etapas 1 a 5 garantiu:
- Uma base técnica desacoplada em múltiplos ambientes (`base`, `dev`, `prod`).
- Mecanismo rigoroso de autenticação web baseado em sessão Django e proteção CSRF, além de autenticação dedicada para dispositivos de telemetria baseada em cabeçalho criptográfico (`X-Device-Key`).
- Controle de escopo de dados multi-inquilino (`imoveis_visiveis`), assegurando que cada usuário acerte somente o que lhe cabe por perfil ou vinculação territorial.
- Ingestão idempotente e cronológica de leituras de telemetria com travas de concorrência (`select_for_update`).
- Motor de regras de anomalias com consolidação de alertas operacionais.
- Ciclos de vida com máquinas de estados finitos para ordens de serviço, ocorrências técnicas e solicitações de moradores.
- Comando lógico de abertura e fechamento de válvulas com auditoria obrigatória.
- Comandos utilitários para carga de dados (`seed_demo`) e simulação temporal (`simulate_readings`).

---

## 2. Funcionalidades Implementadas

As funcionalidades desenvolvidas e validadas entre as Etapas 1 e 5 contemplam as seguintes capacidades do sistema:

### 2.1 Gestão de Ambientes e Infraestrutura de Backend (Etapa 1)
- **Configuração Modularizada:** Separação das definições em `setup/settings/base.py`, `dev.py` e `prod.py`, permitindo alternância clara entre desenvolvimento e produção.
- **Persistência Homogênea em SQLite:** Padronização definitiva da base no arquivo `db.sqlite3` (`django.db.backends.sqlite3`), com a remoção total da dependência de MySQL e do pacote `mysqlclient`.
- **Serviço de Arquivos Estáticos:** Inclusão e configuração do middleware `WhiteNoise` para entrega otimizada de recursos estáticos versionados.
- **Gestão Segura de Variáveis de Ambiente:** Integração de `django-environ` para parsing de variáveis a partir do `.env`, com modelo versionado em `.env.example`.
- **Contrato OpenAPI Automatizado:** Configuração de endpoints `/api/schema/` e documentação interativa em `/api/docs/` via `drf-spectacular`, restritos a usuários autenticados para evitar exposição anônima da arquitetura.

### 2.2 Autenticação, Perfis de Usuário e Segurança de Sessão (Etapa 2)
- **Modelo de Usuário Customizado por E-mail:** Identificação primária exclusiva por endereço de e-mail em caixa baixa (normalizado), sem campo de `username`.
- **Perfis de Acesso Distintos:** Implementação de 4 papéis (`roles`):
  - `morador`: Acesso restrito a imóveis em que é proprietário cadastrado.
  - `tecnico`: Atuação técnica em ordens de serviço e comandos operacionais de regiões autorizadas; exige e-mail verificado para autenticar.
  - `operador`: Monitoramento e gestão operacional de ocorrências, alertas e ordens em regiões autorizadas.
  - `administrador`: Acesso irrestrito a todos os recursos, regiões e registros do sistema.
- **Fluxo de Verificação de E-mail de Técnicos:**
  - Geração de código numérico aleatório com armazenamento exclusivo sob hash criptográfico.
  - Validade estrita de 5 minutos (`VERIFICATION_TTL`) e tolerância máxima de 5 tentativas inválidas antes da invalidação do código.
  - Endpoint de conferência `/api/auth/verificacao-email/` público (protegido por CSRF), com respostas genéricas contra ataques de enumeração e controle de concorrência na conferência.
  - Reenvio administrativo de verificação via `/api/auth/reenvio-verificacao/` com cooldown mínimo de 60 segundos.
  - Proteção por limitação de taxa (`VerificationRateThrottle` em 10 req/min por IP) e parametrização de `NUM_PROXIES` para coibir bypass via cabeçalho forjado `X-Forwarded-For`.
- **Gestão de Sessão Web:** Endpoints para obtenção de cookie CSRF (`/api/auth/csrf/`), login (`/api/auth/login/`), logout (`/api/auth/logout/`) e identificação da sessão ativa (`/api/auth/me/`).

### 2.3 Controle de Escopo e Cadastros Fundamentais (Etapa 2)
- **Autorização Centralizada (`imoveis_visiveis`):** Algoritmo que filtra propriedades com base na hierarquia de privilégios. Recursos fora do escopo do requisitante retornam erro `404 Not Found`, ocultando a existência da entidade para usuários não autorizados.
- **CRUD Administrativo de Usuários:** Endpoint `/api/usuarios/` restrito a administradores, exigindo especificação de papel e tamanho mínimo de senha, com registro explícito em auditoria na criação e na exclusão.
- **Cadastros Territoriais e de Ativos:**
  - Regiões geográficas/operacionais (`/api/regioes/`).
  - Imóveis residenciais/comerciais (`/api/imoveis/`), com vínculo a regiões e proprietários.
  - Vínculos explícitos de operadores e técnicos a regiões (`/api/acessos-regiao/`).
  - Dispositivos de medição/hidrômetros (`/api/dispositivos/`).
- **Segurança Criptográfica de Dispositivos:** O cadastro recebe o segredo do hidrômetro (`device_key`), converte-o imediatamente em hash irreversível via `Device.set_device_key()` e nunca retorna o segredo puro em consultas de API.

### 2.4 Trilha de Auditoria do Sistema (Etapa 2)
- **Entidade `AuditLog` Imutável:** Registra autor (`actor`), ação executada (`action`), recurso impactado (`resource`), detalhes complementares em JSON/texto e timestamp em UTC.
- **Auditoria Explícita de Eventos Críticos:** Login, logout, criação/exclusão de usuários, alteração de senhas no Django Admin, reenvio de verificação, reconhecimento de alertas, transições de status operacionais e acionamento de válvulas.
- **Endpoint de Consulta:** Rota `GET /api/auditoria/` restrita a administradores.

### 2.5 Telemetria, Monitoramento e Ingestão de Dados (Etapa 3)
- **Ingestão Segura de Leituras:** Endpoint `POST /api/leituras/` autenticado exclusivamente pelo cabeçalho `X-Device-Key`.
- **Serviço Transacional `registrar_leitura`:**
  - Bloqueio concorrente do dispositivo via `select_for_update`.
  - Validações rígidas: rejeita timestamps futuros, volumes negativos e retrocessos de volume acumulado (leituras regressivas ou fora de ordem cronológica).
  - Idempotência: envio repetido do mesmo `external_id` (UUID) para o mesmo dispositivo retorna `200 OK` sem criar duplicatas no banco de dados.
  - Cálculo incremental prévio: calcula e armazena a variação de consumo (`incremental_consumption`) em relação à medição anterior, otimizando consultas analíticas posteriores.
  - Atualização do campo `Device.last_reading_at`.
  - Disparo síncrono da esteira de avaliação de regras de alertas.
- **Consultas Operacionais de Telemetria:**
  - `GET /api/dashboard/`: Agregação de indicadores de consumo e estado do parque respeitando o escopo do usuário.
  - `GET /api/imoveis/{id}/leituras/`: Listagem histórica de medições de determinado imóvel.
  - `GET /api/imoveis/{id}/consumo/`: Dados consolidados de consumo temporal.
- **Simulador e Utilitários de Carga de Dados:**
  - Management Command `simulate_readings`: Simula séries temporais crescentes de leituras para testes de estresse e validação de gráficos, com trava de segurança que proíbe janelas simuladas superiores a 48 horas.
  - Management Command `seed_demo`: Carga idempotente da base de dados local, criando os 4 perfis de usuários com credenciais padrão, região central, acessos vinculados, imóvel demonstrativo, hidrômetro cadastrado e série de 12 leituras horárias.

### 2.6 Motor de Alertas e Processos Operacionais (Etapa 4)
- **Motor de Alertas (`alerts`):**
  - Regras desacopladas em `alerts/rules.py`. A regra implementada avalia se o consumo incremental ultrapassa o limite definido (`ALERT_CONSUMPTION_THRESHOLD`, padrão: 10.000 m³).
  - Agrupamento inteligente: caso já exista alerta com estado `open` para o mesmo dispositivo e regra, o sistema incrementa o contador de ocorrências (`occurrences_count`) em vez de gerar registros duplicados.
  - Fluxo de reconhecimento via `POST /api/alertas/{id}/reconhecer/` com persistência de operador responsável, data e auditoria.
- **Gestão de Ocorrências (`occurrences`):**
  - Estados: `open` (aberta), `in_progress` (em andamento), `resolved` (resolvida).
  - Histórico de atualizações em `OccurrenceUpdate`, mantendo notas textuais e transições de status.
- **Ordens de Serviço (`workorders`):**
  - Vinculadas a ocorrências e atribuíveis a técnicos que possuam acesso à região do evento.
  - Estados: `pending` (pendente), `in_progress` (em andamento), `completed` (concluída), `canceled` (cancelada).
  - Visibilidade restrita ao técnico designado e à equipe gestora.
- **Solicitações de Moradores (`resident_requests`):**
  - Abertura permitida exclusivamente para moradores proprietários do imóvel afetado.
  - Estados: `open` (aberta), `under_review` (em análise), `completed` (concluída), `canceled` (cancelada).
  - Exigência mandatória de parecer de resolução para conclusão do chamado.

### 2.7 Controle de Válvulas e Módulo de Relatórios (Etapa 5)
- **Comando Lógico de Válvulas (`control`):**
  - Modelo `ValveCommand` registrando histórico completo de comandos (ação: `open` ou `close`, motivo textual, dispositivo, autor e data).
  - Endpoint `GET /api/dispositivos/{id}/valvula/`: Consulta o estado atual da válvula (`open`, `closed` ou `unknown`) para usuários no escopo.
  - Endpoint `POST /api/dispositivos/{id}/valvula/`: Acionamento exclusivo por técnicos, operadores e administradores, exigindo validação de dispositivo ativo (`active=True`), preenchimento obrigatório de justificativa (`reason`) e disparo imediato do evento auditado `valve.commanded`.
- **Serviço de Extração de Relatórios (`relatorios`):**
  - Endpoint genérico `GET /api/relatorios/{tipo}/?formato=csv|pdf` para dados de `consumo`, `leituras`, `alertas` e `ocorrencias`.
  - Suporte implementado para entrega em streaming de arquivos CSV e geração de documentos PDF via ReportLab, aplicando filtros de período, região e imóvel sob o escopo do usuário requisitante e gerando registro de auditoria (`report.exported`).
  *(Nota técnica: Conforme registrado nas decisões consolidadas da Etapa 5, a geração de arquivos físicos de relatórios foi descontinuada do escopo do MVP).*

---

## 3. Módulos e Componentes

A tabela e os tópicos a seguir detalham os componentes arquiteturais implementados na aplicação:

### 3.1 Módulos da Aplicação Django

| Módulo / App | Responsabilidade e Entidades Principais |
| :--- | :--- |
| **`setup`** | Configuração global do projeto, rotas principais (`urls.py`), middlewares, settings modulares (`base.py`, `dev.py`, `prod.py`) e configuração do drf-spectacular. |
| **`accounts`** | Gestão de identidade e segurança. Model `User`, controle de perfis (`role`), verificação de e-mails técnicos (`EmailVerification`), formulários e customizações do Django Admin (`UserAdmin`, `UserCreationForm`, `UserChangeForm`), autenticação de sessão e views de autorização. |
| **`hidroscan`** | Domínio geográfico e cadastral. Models `Region`, `Property`, `Device`, `RegionAccess` e `AuditLog`. Regras de escopo (`imoveis_visiveis`), formulários de dispositivo (`DeviceAdminForm`), comandos de CLI (`seed_demo`) e infraestrutura de auditoria (`register_audit`). |
| **`monitoring`** | Telemetria e consumo. Model `Reading`, serviço atômico `registrar_leitura()`, endpoints de consulta de dashboard, séries temporais e comando de simulação cronológica (`simulate_readings`). |
| **`alerts`** | Detecção de anomalias hídricas. Model `Alert`, regras de negócio puras em `rules.py` (consumo acima do limiar) e endpoint de reconhecimento de incidentes. |
| **`occurrences`** | Gestão de ocorrências e chamados técnicos. Models `Occurrence` e `OccurrenceUpdate`, controle de transições de status e histórico de apontamentos. |
| **`workorders`** | Ordens de serviço para equipes de campo. Model `WorkOrder`, atribuição individual a técnicos e transições de ciclo de vida. |
| **`resident_requests`** | Canal de atendimento do morador. Model `ResidentRequest`, validação de propriedade do solicitante e regras de resolução. |
| **`control`** | Atuação sobre equipamentos. Model `ValveCommand`, serviço atômico `command_valve()`, validação de dispositivo inativo (`InactiveDeviceError`) e endpoints de controle/consulta de estado de válvulas. |

### 3.2 Matriz de Endpoints da API REST Implementada

| Rota | Método(s) | Autenticação / Permissão | Finalidade |
| :--- | :---: | :--- | :--- |
| `/api/schema/` | GET | `IsAuthenticated` | Download da especificação OpenAPI 3.0. |
| `/api/docs/` | GET | `IsAuthenticated` | Interface interativa de documentação Swagger/Redoc. |
| `/api/auth/csrf/` | GET | Pública | Emissão e renovação de cookie CSRF. |
| `/api/auth/login/` | POST | Pública (exige CSRF) | Abertura de sessão autenticada por e-mail e senha. |
| `/api/auth/logout/` | POST | `IsAuthenticated` | Encerramento da sessão web e limpeza de credenciais. |
| `/api/auth/me/` | GET | `IsAuthenticated` | Retorno dos dados cadastrais e perfil do usuário logado. |
| `/api/auth/verificacao-email/`| POST | Pública (exige CSRF + Throttle) | Validação do código de 6 dígitos para ativação de técnicos. |
| `/api/auth/reenvio-verificacao/`| POST | Administrador | Emissão de novo código de verificação para técnicos pendentes. |
| `/api/usuarios/` | CRUD | Administrador | Gestão administrativa de usuários do sistema. |
| `/api/regioes/` | CRUD | Administrador | Cadastro e manutenção de regiões operacionais. |
| `/api/imoveis/` | CRUD | Autenticado (sob escopo) | Gestão de propriedades com filtragem por perfil/região. |
| `/api/dispositivos/` | CRUD | Administrador / Técnico | Gestão de hidrômetros (chave é gravada sob hash). |
| `/api/acessos-regiao/` | CRUD | Administrador | Atribuição de operadores e técnicos a regiões de atuação. |
| `/api/auditoria/` | GET | Administrador | Consulta paginada a logs imutáveis de auditoria. |
| `/api/leituras/` | POST | `X-Device-Key` (Dispositivo) | Ingestão atômica de dados de telemetria dos hidrômetros. |
| `/api/dashboard/` | GET | Autenticado (sob escopo) | Indicadores agregados de telemetria e operação. |
| `/api/imoveis/{id}/leituras/`| GET | Autenticado (sob escopo) | Consulta de medições históricas de uma propriedade. |
| `/api/imoveis/{id}/consumo/` | GET | Autenticado (sob escopo) | Consulta de consumo volumétrico por intervalo de tempo. |
| `/api/alertas/` | GET | Autenticado (sob escopo) | Listagem de alertas de anomalia ativos ou resolvidos. |
| `/api/alertas/{id}/reconhecer/`| POST | Operador / Técnico / Admin | Confirmação e reconhecimento de um alerta pendente. |
| `/api/ocorrencias/` | CRUD | Autenticado (sob escopo) | Gestão e abertura de ocorrências operacionais. |
| `/api/ocorrencias/{id}/atualizacoes/` | GET/POST | Autenticado (sob escopo) | Inserção e consulta de atualizações em ocorrências. |
| `/api/ordens-servico/` | CRUD | Operador / Técnico / Admin | Gestão de ordens de serviço de manutenção. |
| `/api/ordens-servico/{id}/status/` | POST | Técnico atribuído / Admin | Atualização de estado da ordem de serviço. |
| `/api/solicitacoes/` | CRUD | Autenticado (sob escopo) | Chamados abertos por moradores para seus imóveis. |
| `/api/solicitacoes/{id}/status/` | POST | Equipe operacional / Admin | Modificação de status e encerramento de solicitações. |
| `/api/dispositivos/{id}/valvula/` | GET | Autenticado (sob escopo) | Consulta do estado lógico atual da válvula (`open`/`closed`). |
| `/api/dispositivos/{id}/valvula/` | POST | Operador / Técnico / Admin | Execução de comando de corte ou liberação da válvula. |
| `/api/relatorios/{tipo}/` | GET | Autenticado (sob escopo) | Exportação de dados consolidados (CSV streaming / PDF). |

---

## 4. Tecnologias Utilizadas

O ecossistema implementado nas Etapas 1 a 5 faz uso das seguintes linguagens, frameworks, bibliotecas e ferramentas:

| Categoria | Tecnologia / Ferramenta | Finalidade no Projeto |
| :--- | :--- | :--- |
| **Linguagem de Programação** | Python | Linguagem principal do ecossistema backend. |
| **Framework Web Principal** | Django 6.1.2 | Estrutura central da aplicação, ORM, autenticação e sistema administrativo. |
| **API Toolkit** | Django REST Framework (DRF) 3.18.3 | Construção de endpoints REST, serializadores, paginação, permissões e autenticação. |
| **Documentação OpenAPI** | `drf-spectacular` | Geração do schema OpenAPI 3.0 e disponibilização do Swagger UI em `/api/docs/`. |
| **Banco de Dados** | SQLite (`db.sqlite3`) | Sistema gerenciador de banco de dados adotado formalmente para o MVP local. |
| **Servidor de Arquivos Estáticos**| WhiteNoise | Empacotamento e entrega de assets estáticos em conformidade com boas práticas de deploy. |
| **Configuração de Ambiente** | `django-environ` | Leitura e validação de configurações a partir do arquivo `.env`. |
| **Geração de Documentos** | ReportLab | Biblioteca utilizada na implementação do gerador de relatórios em formato PDF. |
| **Segurança e Criptografia** | Django Cryptographic Hashers | Hashing seguro de senhas de usuários e de chaves de hidrômetros (`device_key`). |
| **Suíte de Testes Automatizados** | `pytest` / Django Test Runner | Execução e validação de 85 testes cobrindo autenticação, regras e integração de API. |
| **Linha de Comando e Gestão** | PowerShell / `manage.py` | Execução de comandos do projeto (`simulate_readings`, `seed_demo`, `check`). |

---

## 5. Correções e Melhorias Realizadas

Ao longo das etapas 1 a 5 e das respectivas revisões técnicas, foram identificados e solucionados múltiplos apontamentos arquiteturais e de segurança:

1. **Proteção da Documentação da API:**
   - *Problema:* O padrão do `drf-spectacular` era `AllowAny`, expondo a documentação dos endpoints publicamente.
   - *Solução:* Configurado `SPECTACULAR_SETTINGS["SERVE_PERMISSIONS"] = ["rest_framework.permissions.IsAuthenticated"]`, exigindo autenticação prévia.

2. **Normalização e Prevenção de Colisão de E-mails:**
   - *Problema:* Discrepâncias de maiúsculas/minúsculas poderiam acarretar erros de integridade (`IntegrityError` com erro 500) na base de dados.
   - *Solução:* Normalização padronizada em caixa baixa no model (`clean`/`save`), nos serializers e na autenticação; criação de migration de dados preventiva (`accounts.0002_normalize_existing_emails`) e rejeição com `400 Bad Request` antes de bater no banco de dados.

3. **Arquitetura de Verificação de Técnicos e Mitigação de Spoofing:**
   - *Problema:* O fluxo de verificação exigia sessão prévia, impedindo técnicos não ativados de confirmar o código; além disso, tentativas inválidas podiam contornar o throttle caso falsificassem o cabeçalho `X-Forwarded-For`.
   - *Solução:* Endpoint de verificação desacoplado de sessão (mantendo CSRF obrigatório); contagem e persistência de tentativas inválidas no banco de dados com bloqueio estrito após 5 falhas; implementação do throttle `VerificationRateThrottle` (10 req/min por IP) e configuração de `NUM_PROXIES = 0` para ambientes locais.

4. **Auditoria Transacional Explícita (Eliminação de Signals Espúrios):**
   - *Problema:* Signals genéricos em `post_save` geravam registros redundantes e incorretos na auditoria (como atualizações de `last_login` atribuídas ao próprio usuário).
   - *Solução:* Desativação dos signals em `hidroscan.signals` e adoção de auditoria explícita nos endpoints e operações de negócio (`login_view`, `logout_view`, criação, alteração e exclusão de usuários via `perform_destroy`).

5. **Tratamento de Dispositivos Inativos em Comandos de Válvula:**
   - *Problema:* O envio de comandos de corte/abertura de válvula para dispositivos inativos causava falha interna com erro 500 (`Device.DoesNotExist`).
   - *Solução:* Criação da exceção `InactiveDeviceError` e tratamento controlado na view `POST /api/dispositivos/{id}/valvula/`, devolvendo `400 Bad Request` com mensagem clara ao usuário.

6. **Integridade de Fixtures de Testes:**
   - *Problema:* Testes automatizados de Alertas e Ocorrências quebravam em SQLite devido à ausência do campo obrigatório `owner` na entidade `Property`.
   - *Solução:* Ajuste nas fixtures fornecendo instâncias válidas de moradores vinculadas às propriedades nos testes de `alerts/tests.py` e `occurrences/tests.py`.

7. **Aprimoramento do Django Admin e Operações em Massa:**
   - *Problema:* Formulários padrão do Django Admin não suportavam adequadamente a criação de usuários sem `username`, e exclusões em massa não passavam pelos hooks de auditoria unitários.
   - *Solução:* Criação dos formulários `UserCreationForm`, `UserChangeForm` e `DeviceAdminForm`; sobrescrita de `delete_queryset` em todos os `ModelAdmin`s sob `transaction.atomic()`, assegurando auditoria completa em operações individuais e em lote.

8. **Proteção de Simulações Temporais:**
   - *Problema:* Parâmetros desregulados no comando `simulate_readings` poderiam injetar dezenas de milhares de registros, degradando a performance do SQLite local.
   - *Solução:* Implementação de validação rígida bloqueando parâmetros cuja janela temporal calculada ultrapasse o limite de 48 horas.

---

## 6. Pendências e Decisões de Escopo

Com o intuito de delimitar com exatidão o que está concluído frente ao que é planejado ou que foi deliberadamente postergado/descontinuado, registram-se os seguintes pontos:

### 6.1 Etapas Posteriores Não Executadas (Planejamento Futuro)
- **Etapa 6 (Integração React ↔ Django):** Totalmente pendente. O frontend segue utilizando dados e autenticações simuladas (`frontend/src/data/`). A configuração de proxy no Vite, a refatoração do `AuthContext.tsx` e o consumo real das rotas `/api/` são o escopo exclusivo dessa etapa vindoura.
- **Etapa 7 (Empacotamento e Entrega Local):** Planejada. Contempla a compilação do frontend via `npm run build`, entrega dos assets compilados via WhiteNoise/Django, fallback de rotas da SPA para `index.html` e parametrização de segurança para produção.
- **Etapa 8 (Homologação e Homologação Final):** Planejada. Execução da matriz completa de homologação ponta a ponta com interface gráfica e backend integrados.

### 6.2 Pendência Operacional Imediata no Banco Local
- **Aplicação das Migrations no `db.sqlite3`:** As migrations de todos os apps foram geradas e testadas exaustivamente em banco temporário durante a suíte de testes (com 85 testes aprovados). Contudo, a aplicação real no arquivo `db.sqlite3` do ambiente de desenvolvimento local ainda não foi realizada, aguardando execução autorizada do comando:
  ```powershell
  .\venv\Scripts\python.exe manage.py migrate
  ```

### 6.3 Decisões de Escopo e Recursos Excluídos do MVP
- **Descontinuação de Relatórios em PDF e CSV:** Embora os serviços e rotas de relatórios tenham sido implementados na Etapa 5, foi deliberadamente acordado retirar a exportação física de PDF e CSV do escopo do MVP, mantendo a experiência focada na exibição de dados e gráficos na própria interface do usuário.
- **Controle de Válvula Puramente Lógico:** Não existe integração com atuadores físicos ou telemetria bidirecional via hardware IoT. O acionamento de válvula no MVP atualiza imediatamente o campo lógico `Device.valve_state` no banco de dados e registra a auditoria.
- **Recuperação de Senha por E-mail:** Inexistente no MVP. Trocas de credenciais de emergência são restritas ao painel administrativo Django Admin pelo administrador. O link visual correspondente foi removido do frontend.
- **Telemetria de Estado de Sensores:** Eventos como perda de bateria, ausência de conectividade ou falhas eletrônicas do hidrômetro não são modelados no MVP, visto que os dados são integralmente sintéticos.
- **Mural de Comunicados de Moradores (`ResidentNoticesPage`):** Permanece como tela estática/mockada no frontend, inexistindo endpoints ou models persistidos no backend para esta finalidade.
- **Upload de Arquivos/Anexos:** Abertura de ordens de serviço, ocorrências e solicitações não suporta anexos de fotos ou arquivos pesados.
- **Limitação de Auditoria em Shell:** Operações executadas diretamente via `python manage.py shell` utilizando o ORM do Django não disparam eventos na tabela de auditoria de aplicação (limitação conhecida de arquitetura).

---

## 7. Conclusão Técnica

As Etapas 1 a 5 foram consolidadas com alto nível de maturidade arquitetural e robustez. A API Django REST Framework encontra-se plenamente estável, protegida e coberta por 85 testes automatizados. O sistema está tecnicamente preparado para que a equipe de frontend execute a Etapa 6 de integração cliente-servidor.
