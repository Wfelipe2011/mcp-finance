## ADDED Requirements

### Requirement: Exclusão de pares (data, categoria) específicos via feedback
O sistema SHALL permitir que o usuário marque pares `(transaction_date, category_pt)` específicos como atípicos via 👎, armazenando-os em `forecast_daily_exclusions` para que sejam excluídos do próximo ciclo de treinamento.

#### Scenario: 👎 em resultado de teste gera exclusão
- **WHEN** o usuário clica 👎 em um item do conjunto de teste
- **THEN** insere `(tenant_id, transaction_date, category_pt, correction_tag)` em `forecast_daily_exclusions`

#### Scenario: Motivo da exclusão opcional
- **WHEN** o usuário clica 👎
- **THEN** pode opcionalmente selecionar `correction_tag` entre: `'Viagem'`, `'Evento especial'`, `'Mudança de hábito'`, `'Outra situação atípica'`

#### Scenario: Item marcado como 👎 não pode ser re-treinado sem remoção
- **WHEN** o usuário solicita re-treino
- **THEN** todos os pares em `forecast_daily_exclusions` são excluídos do dataset antes do split 80/20

#### Scenario: Usuário pode remover uma exclusão
- **WHEN** o usuário clica em "Desfazer exclusão" em um item marcado como 👎
- **THEN** o registro é removido de `forecast_daily_exclusions` e o item retorna ao estado normal

#### Scenario: Contador de exclusões exibido na UI
- **WHEN** a tela de Treinar é exibida
- **THEN** mostra o total de pares atualmente excluídos via `forecast_daily_exclusions`

#### Scenario: Tenant-isolation
- **WHEN** uma exclusão é criada
- **THEN** é associada ao `tenant_id` do usuário autenticado e não afeta outros tenants
