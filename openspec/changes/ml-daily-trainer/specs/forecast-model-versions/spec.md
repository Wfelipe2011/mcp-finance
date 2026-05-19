## ADDED Requirements

### Requirement: Tabela de versões do modelo diário
O sistema SHALL manter uma tabela `forecast_model_versions` que registra cada versão treinada do modelo diário por tenant, com metadados de acurácia, referência ao arquivo `.pkl` e controle de ciclo de vida.

#### Scenario: Criação de versão staging após treino
- **WHEN** `daily_trainer.py` conclui um treino com sucesso
- **THEN** insere em `forecast_model_versions` com `status='staging'`, `version_name = 'daily-v{YYYYMMDD}-{HHMMSS}'`, `file_path = '/models/{tenant_id}/{version_name}.pkl'`

#### Scenario: Ativação de modelo staging para production
- **WHEN** o usuário clica em "Ativar como produção" para uma versão `staging`
- **THEN** o status da versão anterior `production` é atualizado para `archived` e a versão selecionada passa para `production`, registrando `activated_at`

#### Scenario: Arquivo de modelo apagado ao arquivar
- **WHEN** o usuário solicita deleção do `.pkl` de uma versão `archived` ou `staging`
- **THEN** o arquivo é removido do volume e `file_path` é definido como NULL em `forecast_model_versions`

#### Scenario: Modelo production não pode ter .pkl deletado
- **WHEN** o usuário tenta deletar o `.pkl` de uma versão com `status='production'`
- **THEN** a API retorna erro 409 com mensagem "Arquive o modelo antes de deletar o arquivo"

#### Scenario: Listagem de versões por tenant
- **WHEN** o usuário acessa a tela de gerenciamento de versões
- **THEN** vê todas as versões ordenadas por `created_at DESC` com status, MAE, MAPE, accuracy_pct e tamanho do arquivo quando disponível

### Requirement: Coluna model_version nas predições diárias
O sistema SHALL registrar qual versão do modelo gerou cada predição em `forecast_daily_predictions.model_version`.

#### Scenario: Predições marcadas com versão do modelo
- **WHEN** um modelo ativado gera `forecast_daily_predictions`
- **THEN** a coluna `model_version` recebe o `version_name` correspondente (ex: `daily-v20260517-143022`)
