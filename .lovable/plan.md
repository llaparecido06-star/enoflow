# Plano: CRM Admin + Features Turista

Hífen pendurado dos Pacotes já corrigido. Agora entregamos dois grandes blocos.

---

## Bloco 1 — CRM Completo no Painel Admin

Substitui a página atual `/admin/:slug/leads` por um módulo CRM unificado com 3 abas.

### 1.1 Pipeline (Kanban) — aba "Funil"

Colunas fixas: **Novo → Contatado → Qualificado → Convertido → Perdido**

- Cards de lead arrastáveis entre colunas (drag-and-drop com `@dnd-kit/core`, já instalado em projetos similares — verificar e adicionar se faltar)
- Cada card mostra: nome, persona, ticket médio, dias desde última visita, badge de tags
- Atribuição de lead a um membro da equipe (dropdown com staff da vinícola)
- Contador por coluna + valor estimado da coluna

### 1.2 Timeline 360° do Lead — modal/drawer ao clicar no card

Vista única consolidada do lead:
- **Perfil**: persona, idade, gênero, classe de renda, vinhos favoritos
- **Atividade**: visitas (`capture_history`), vouchers gerados/redimidos, NPS dado
- **Compras**: histórico de itens comprados, ticket médio, frequência
- **Notas**: anotações manuais da equipe (quem, quando, o quê)
- **Tags**: livres ("VIP", "aniversário em junho", "intolerante a sulfito"…)
- **Comunicação**: log de mensagens WhatsApp enviadas (registro local)

### 1.3 Segmentação + Ações em Massa — aba "Segmentos"

Filtros combináveis (AND): persona, faixa de ticket, NPS mín, recência (últimos N dias), frequência (≥ N visitas), gênero, faixa etária, tags, estágio do funil.

Ações em massa sobre o resultado:
- Adicionar tag em lote
- Mover de estágio em lote
- **Enviar campanha WhatsApp em lote** com templates (vide 1.4)
- Exportar CSV
- Salvar segmento (consulta nomeada reutilizável)

### 1.4 Templates de WhatsApp + Envio em Lote Manual

Biblioteca de templates por estágio do funil, com variáveis `{{nome}}`, `{{vinho_favorito}}`, `{{ultima_visita}}`.
- CRUD de templates por vinícola
- Tela de envio em lote: escolher segmento + template → preview por lead → botão "Iniciar envio" abre `wa.me/...` em sequência (compatível com a memória existente sobre wa.me com delay)
- Cada envio confirmado registra log na timeline do lead

### 1.5 Mudanças de Backend

Nova tabela:
```text
crm_lead_state (id, lead_id, winery_id, stage, assigned_admin_id,
                tags[], estimated_value, updated_at)
crm_lead_notes (id, lead_id, winery_id, admin_id, body, created_at)
crm_message_log (id, lead_id, winery_id, admin_id, template_id,
                 channel, sent_at, payload)
crm_message_templates (id, winery_id, name, stage, body, vars[], created_at)
crm_saved_segments (id, winery_id, name, filters jsonb, created_at)
```

Edge function nova: `admin-crm` (verbos: list_pipeline, move_stage, upsert_note, upsert_tag, send_template_log, list_templates, save_segment, query_segment). Reutiliza `_shared/auth.ts`.

RLS: tabelas com policies "no direct" — todo acesso via edge function isolando por `winery_id` da sessão.

---

## Bloco 2 — Novas Funcionalidades no Modo Turista

### 2.1 Programa de Fidelidade (selo digital)
- A cada voucher redimido, +1 ponto. Marcos: 3, 5, 10 vouchers → desbloqueiam recompensa exibida na vinícola
- Card "Meus selos" no `/journey` com progresso visual e celebração ao bater marco
- Backend: campo `loyalty_points` em `users_leads` + tabela `loyalty_rewards` por vinícola configurável no Admin

### 2.2 Indicação de Amigos (referral)
- Botão "Indicar amigo" gera link único `/w/{slug}?ref={user_id}`
- Quando o amigo gera o primeiro voucher, ambos ganham +1 selo
- Tela "Minhas indicações" com status (pendente/convertida)

### 2.3 Recomendações IA Personalizadas no /journey
- Card "Para o seu paladar" usando Lovable AI Gateway (`google/gemini-2.5-flash`)
- Input: persona + ratings + favoritos + histórico → Output: 3 vinhos da vinícola que o usuário ainda não provou, com justificativa em 1 frase

### 2.4 Histórico de Compras Enriquecido
- Em `VoucherHistory`, agrupar por mês, mostrar foto dos vinhos comprados e botão "Comprar de novo" que repopula o carrinho

### 2.5 Micro-melhorias UX
- Skeletons em todas as listas (Shop, Restaurant, Tasting)
- Feedback háptico nos botões críticos (já existe `lib/haptic.ts`, expandir uso)
- Toast de sucesso com confete ao gerar voucher (já existe Confetti — reutilizar)

---

## Ordem de Entrega

1. **Migração de banco** (CRM + loyalty + referral) — uma única migração consolidada
2. **Edge function `admin-crm`**
3. **CRM UI** (Funil → Timeline → Segmentos → Templates)
4. **Modo Turista**: Fidelidade → Recomendações IA → Indicação → Histórico enriquecido → Polish UX

Vou pausar para sua aprovação antes de implementar — depois disso, executo tudo em sequência sem novas perguntas.

---

## Notas Técnicas

- Drag-and-drop: `@dnd-kit/core` + `@dnd-kit/sortable`
- Templates WhatsApp seguem padrão wa.me já estabelecido (memória `marketing-campaigns`)
- Toda escrita passa por edge function — RLS bloqueia acesso direto, mantendo padrão de segurança da plataforma
- IA via Lovable AI Gateway (sem chave do usuário)
- Tudo respeita light mode e isolamento por `winery_id`