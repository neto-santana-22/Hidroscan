# Decisões de arquitetura

## AD-001 — Banco e compatibilidade

- O backend permanecerá em Django 6.1.2.
- O banco é SQLite, armazenado no arquivo local `db.sqlite3` e acessado exclusivamente pelo ORM do Django.
- Models e migrações Django são a fonte da verdade do esquema. O arquivo de banco é criado e atualizado por `python manage.py migrate` e não é versionado.
- O uso é adequado ao MVP com volume moderado de escrita. Se a concorrência de gravações crescer, a escolha deverá ser reavaliada antes de migrar dados.

## AD-002 — Entidades de atendimento

- `Occurrence`, `WorkOrder` e `ResidentRequest` são entidades distintas e fazem parte desta fase de implementação.
- Uma ocorrência pode originar uma ou mais ordens de serviço, mas a relação e as transições de estado serão definidas antes de modelar as migrações.
- Solicitações de moradores não são tratadas como alertas nem como ocorrências automaticamente; uma eventual conversão será uma ação explícita e auditável.

## AD-003 — Limites desta etapa

- Esta etapa apenas registra decisões e prepara configuração/dependências declarativas.
- Não há instalação de pacotes, criação de banco, alteração de esquema, migração ou acesso a dados.
