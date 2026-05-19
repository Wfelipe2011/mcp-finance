## ADDED Requirements

### Requirement: Exclusão de categorias inteiras do treinamento
O sistema SHALL permitir que o usuário exclua categorias inteiras do treinamento do modelo diário, impedindo que essas categorias gerem predições futuras.

#### Scenario: Usuário exclui categoria do treinamento
- **WHEN** o usuário desativa uma categoria na tela de Treinar
- **THEN** um registro é inserido em `forecast_category_exclusions(tenant_id, category_pt)` e a UI reflete imediatamente o estado como excluída

#### Scenario: Usuário reativa categoria excluída
- **WHEN** o usuário reativa uma categoria previamente excluída
- **THEN** o registro correspondente é removido de `forecast_category_exclusions`

#### Scenario: Categorias excluídas não aparecem no treinamento
- **WHEN** `daily_trainer.py` carrega o dataset de treino
- **THEN** linhas cujo `category_pt` está em `forecast_category_exclusions` para aquele tenant são removidas antes do split 80/20

#### Scenario: Categorias excluídas não geram predições diárias
- **WHEN** o modelo ativado gera `forecast_daily_predictions` para os próximos 30 dias
- **THEN** categorias presentes em `forecast_category_exclusions` não recebem predições

#### Scenario: Lista de categorias disponíveis exibida na UI
- **WHEN** o usuário abre a seção de gerenciamento de categorias
- **THEN** vê todas as categorias distintas com transações no histórico, cada uma com toggle ativo/excluído e contagem de ocorrências

#### Scenario: Tenant-isolation
- **WHEN** um tenant exclui uma categoria
- **THEN** a exclusão é isolada por `tenant_id` e não afeta outros tenants
