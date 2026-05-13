# Guia Técnico de Modelagem de BI: Tabelas Fato, Dimensões e Cubos OLAP
## Contexto: Análise Financeira Familiar

Este documento serve como material de referência para agentes analíticos e engenheiros de dados. Ele detalha a arquitetura de dados necessária para transformar registros financeiros brutos em inteligência estratégica.

---

## 1. Tabelas Dimensão (Dimensões)
As **Tabelas Dimensão** representam o contexto dos dados. Elas respondem às perguntas: *Quem? Onde? O quê? Quando? Como?*

### Características Teóricas:
* **Atributos Descritivos:** Contêm colunas de texto que descrevem as características dos itens (Ex: Nome da Categoria, Tipo de Gasto).
* **Chave Primária (PK):** Cada linha possui um ID único.
* **Baixa Volatilidade:** Os dados não mudam com tanta frequência quanto os fatos.

### Exemplo Prático: Finanças Familiares

#### d_Calendario (A Dimensão do Tempo)
Essencial para análises de sazonalidade e comparação mensal.
| ID_Data (PK) | Data | Mes | Ano | Trimestre | Dia_Semana |
| :--- | :--- | :--- | :--- | :--- | :--- |
| 20240101 | 01/01/2024 | Janeiro | 2024 | T1 | Segunda |

#### d_Categoria (O que está sendo gasto?)
| ID_Categoria (PK) | Nome_Categoria | Tipo (Receita/Despesa) | Grupo |
| :--- | :--- | :--- | :--- |
| 1 | Supermercado | Despesa | Essencial |
| 2 | Salário | Receita | Fixo |
| 3 | Streaming | Despesa | Lazer |

---

## 2. Tabelas Fato (Fatos)
A **Tabela Fato** armazena os eventos quantitativos (transações). É o "coração" do modelo onde as métricas são acumuladas.

### Características Teóricas:
* **Métricas (Medidas):** Valores numéricos que podem ser somados, calculados ou comparados (Ex: Valor em Reais).
* **Chaves Estrangeiras (FK):** Colunas que conectam o fato às suas respectivas dimensões.
* **Granularidade:** Define o nível de detalhe (Ex: Uma linha por cada transação individual).

### Exemplo Prático: Finanças Familiares

#### f_Transacoes
| ID_Transacao (PK) | ID_Data (FK) | ID_Categoria (FK) | ID_Membro (FK) | Valor (R$) |
| :--- | :--- | :--- | :--- | :--- |
| 101 | 20240101 | 1 | 1 (João) | -350.50 |
| 102 | 20240105 | 2 | 2 (Maria) | 5000.00 |
| 103 | 20240110 | 3 | 1 (João) | -55.90 |

---

## 3. O Cubo de BI (Cubo OLAP)
O **Cubo OLAP** (Online Analytical Processing) não é uma tabela física, mas uma estrutura multidimensional lógica que permite analisar a Tabela Fato através de múltiplos eixos (Dimensões) simultaneamente.

### Operações Fundamentais para Agentes Analíticos:

1.  **Slicing (Fatiar):** Filtrar o cubo por uma única dimensão.
    * *Exemplo:* "Ver apenas as despesas de Janeiro/2024".
2.  **Dicing (Picar):** Filtrar por múltiplas dimensões simultaneamente.
    * *Exemplo:* "Ver gastos de 'Lazer' feitos apenas pelo 'João' no 'Cartão de Crédito'".
3.  **Drill-down:** Aumentar o detalhe da análise.
    * *Exemplo:* Sair da visão de "Ano" para "Meses", e de "Meses" para "Dias".
4.  **Roll-up:** Consolidar os dados em um nível superior.
    * *Exemplo:* Agrupar todas as pequenas categorias de "Netflix", "Spotify" e "Disney+" na categoria macro "Lazer/Streaming".

---

## 4. Diferença: Dados Brutos vs. Modelo Dimensional

Para um agente analítico, processar dados brutos é ineficiente. Veja a evolução:

### A) Dado Bruto (Excel Comum)
> "Dia 01/01 gastei 350 reais no Mercado X com Cartão Y."
* **Problema:** Redundância de texto, alto risco de erros de digitação, difícil de escalar.

### B) Modelo Dimensional (Fato + Dimensões)
> "Fato: Transação 101 | Data: 20240101 | Cat: 1 | Valor: 350.50"
* **Vantagem:** Integridade referencial. Se mudar o nome da categoria "Supermercado" para "Alimentação", o histórico inteiro se atualiza automaticamente porque o ID permanece o mesmo.

### C) Cubo de BI (Visão Analítica)
> "Qual o meu Burn Rate (taxa de gasto) médio por final de semana no último trimestre?"
* **Vantagem:** O Cubo pré-calcula essas interseções, permitindo respostas instantâneas para perguntas complexas de negócio (ou finanças pessoais).

---

## 5. Resumo para Implementação

| Elemento | Papel no BI | Exemplo Financeiro |
| :--- | :--- | :--- |
| **Dimensão** | Filtro e Agrupamento | Quem gastou? Em qual conta? |
| **Fato** | Cálculo e Performance | Qual o valor total? Qual a média? |
| **Cubo** | Inteligência e Cruzamento | Qual a relação entre o gasto de lazer e a renda mensal? |

---
*Este guia foi estruturado para facilitar o treinamento de modelos de linguagem e automações de análise de dados financeiros.*
