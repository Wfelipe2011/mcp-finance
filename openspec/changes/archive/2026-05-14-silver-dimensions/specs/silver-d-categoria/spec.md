## ADDED Requirements

### Requirement: View d_categoria expõe hierarquia de categorias em português
O sistema SHALL criar uma view `d_categoria` sobre `category_groups LEFT JOIN category_labels` expondo: `category_id` (TEXT, ID da categoria Pluggy), `category_pt` (TEXT, nome da categoria em português), `group_code` (TEXT, código do grupo), `group_pt` (TEXT, nome do grupo em português). Categorias sem label PT SHALL usar o nome original como fallback.

#### Scenario: Categoria com label PT retorna nome traduzido
- **WHEN** `d_categoria` é consultada para uma `category_id` com label cadastrado
- **THEN** `category_pt` retorna o label em português

#### Scenario: Categoria sem label usa fallback do nome original
- **WHEN** `d_categoria` é consultada para uma `category_id` sem label em `category_labels`
- **THEN** `category_pt` retorna o nome original da categoria (não nulo)

#### Scenario: Todos os grupos de categoria aparecem
- **WHEN** `d_categoria` é consultada sem filtros
- **THEN** todos os `group_code` distintos de `category_groups` estão representados
