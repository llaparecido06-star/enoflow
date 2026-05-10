## CRM Pro — versão "HubSpot-grade"

Foco: completar o ciclo de vendas com **rastreio fim-a-fim de mensagens, calendário visual, lembretes ativos, papel de Atendente, ownership e fila de distribuição automática**, mantendo o padrão de segurança (RLS + Edge Functions) e UI light mode.

---

### 1. Status de envio das mensagens agendadas

**DB (`crm_scheduled_messages`)**
- Já tem `status` (pendente/enviada/cancelada). Adicionar valores `erro` e coluna `error_reason TEXT`, `attempted_at TIMESTAMPTZ`.
- Cada mudança de status grava entrada em `crm_message_log` (canal `whatsapp`, body, template_id) — isso aparece automaticamente no Timeline 360°.

**Edge `admin-crm`**
- `mark_scheduled_sent` → status=`enviada` + insere em `crm_message_log` + cria evento timeline "Mensagem enviada".
- Nova action `mark_scheduled_error` (motivo) → status=`erro` + log timeline.
- `cancel_scheduled` → log timeline "Mensagem cancelada".
- `list_scheduled` retorna agrupado por status com badges.

**UI `ScheduledQueue.tsx`**
- 4 abas: **Para enviar agora · Pendentes · Enviadas (7d) · Erros**.
- Cada item: badge colorido de status, botão "Re-tentar" em erros, "Marcar como enviada" / "Marcar como erro" no menu kebab.
- Toast confirma e atualiza badge superior.

**Timeline (`LeadTimelineModal.tsx`)**
- Nova categoria de evento `message` com ícone Send + cor por status (verde=enviada, âmbar=pendente, vermelho=erro, cinza=cancelada).

---

### 2. Calendário de tarefas do CRM

**Novo componente `TaskCalendar.tsx`** (mês + semana, vanilla — sem dep nova).

```text
┌─ Out 2026 ─────────────────────┬ Filtros: [Tipo] [Atendente] [Status]
│ Seg  Ter  Qua  Qui  Sex  Sáb  │ + Nova tarefa
│  1    2    3 ●● 4    5    6   │
│  …  ●●●            ●          │
└────────────────────────────────┘
Painel direito: tarefas do dia selecionado + botão "Adicionar neste dia"
```

- Pontos coloridos por tipo (followup=azul, ligação=âmbar, visita=violeta, mensagem=verde).
- Click no dia → abre painel lateral com lista + botão **+** que pré-preenche `due_at` com aquela data.
- Filtros persistem em `sessionStorage`.
- Aba **Agenda** ganha 3 sub-views: **Lista · Calendário · Agendadas** (ScheduledQueue).

---

### 3. Lembretes automáticos / notificações

**Novo bell `<NotificationBell />`** no `AdminLayout.tsx`
- Polling a cada 60s via `admin-crm.notifications`.
- Badge vermelho com contagem de: tarefas atrasadas (suas), mensagens prontas para envio, leads novos sem dono >2h.
- Dropdown agrupado por categoria + "Marcar tudo como lido" (estado em `localStorage` por admin).

**Tabela nova `crm_notification_prefs`**
- `admin_id`, `winery_id`, `digest_frequency` (off/15min/hora/dia), `quiet_hours_start`, `quiet_hours_end`, `notify_overdue` bool, `notify_scheduled_ready` bool, `notify_new_lead` bool.

**Edge `admin-crm.get_prefs` / `update_prefs`** + página de preferências em `AdminSettingsPage` (aba "Notificações CRM").

**Lógica:**
- Front respeita `quiet_hours` (silencia toast/badge piscante; ainda acumula contagem).
- Tarefas atrasadas piscam o sino a cada novo intervalo de digest.
- Toast nativo (`sonner`) ao chegar lead novo se aba ativa.

---

### 4. Papel "Atendente" (sales)

**Migration**
- Atualizar enum `admin_role`: adicionar valor `atendente` (mantém compat com `dono`/`gerente`/`funcionario`).
- Mapeamento PT→EN: `atendente` → `sales` no front.

**Permissões (centralizadas em `useAdminAuth`)**
- `atendente` vê APENAS: `/admin/:slug/leads` (CRM) e seu perfil. Sem dashboard, sem vinhos, sem relatórios.
- Filtragem servidor (`admin-crm.list_pipeline`): se role=atendente, retorna só leads onde `crm_lead_state.assigned_admin_id = me`.
- `AdminStaffPage`: novo tipo no formulário.

**Sidebar `AdminLayout`**: oculta itens fora do escopo do atendente.

---

### 5. Ownership de lead (assigned_admin_id)

Já existe `crm_lead_state.assigned_admin_id`. Falta UI/lógica completa.

**LeadCard / LeadTimelineModal**
- Avatar + nome do dono no canto. Botão "Atribuir" → dropdown com staff ativo da vinícola.
- "Reivindicar" se sem dono.
- Filtro novo na barra: **Responsável: [Todos | Sem dono | Eu | <staff>]**.

**Edge `admin-crm.assign_lead`**
- Valida que `assignee` é admin da mesma `winery_id`.
- Insere log no timeline ("Lead atribuído a X por Y").
- `dono`/`gerente` podem reatribuir qualquer lead; `atendente` só pode pegar leads sem dono (claim) — não pode passar para outro.

**Filtro automático para atendente**: já descrito no item 4.

---

### 6. Fila de distribuição automática (round-robin)

**Tabela nova `crm_assignment_queue`**
- `winery_id` (uniq), `enabled` bool default false, `mode` enum (`round_robin`|`load_balanced`), `last_assigned_admin_id` uuid, `updated_at`.

**Tabela nova `crm_assignment_queue_members`**
- `winery_id`, `admin_id`, `position` int, `active` bool. Uniq (winery_id, admin_id).

**Edge `admin-crm`**
- `get_queue` / `set_queue_enabled` / `set_queue_mode` / `add_member` / `remove_member` / `reorder_members`.
- Helper `pickNextAssignee(winery_id)`:
  - **round_robin**: próximo após `last_assigned_admin_id` na lista ativa.
  - **load_balanced**: admin ativo com menos leads abertos (stage ≠ convertido/perdido).
- Chamado automaticamente quando lead novo entra (hook em `tourist-actions` quando cria `users_leads` → cria `crm_lead_state` com `assigned_admin_id` se queue.enabled).
- Toggle `manual_override` no lead: ao atribuir manualmente, lead sai da rotação.

**UI nova aba `/admin/:slug/leads` → Configurações** (ícone gear, visível só p/ dono/gerente)
- Switch "Distribuição automática"
- Modo (radio)
- Lista drag-to-reorder de membros + add/remove
- Preview: "Próximo lead irá para: João"

---

### 7. Polimento UI/UX nível HubSpot

**Pipeline**
- Header com mini-funnel chart (conversion stage→stage), valor estimado total, ticket médio.
- Cards mostram avatar do dono, próxima tarefa pendente, último contato (`X dias atrás`), tags coloridas.
- Hover: ações rápidas inline (📞 ligar via wa.me, ✉ template rápido, ⏰ agendar).
- Stale > 7d: borda âmbar + tooltip explicando.

**Lista virtualizada**
- Colunas configuráveis (mostrar/ocultar via popover).
- Ordenação por LTV/recência/prox. tarefa.
- Seleção múltipla → barra de ações em massa fixa no rodapé (atribuir, mover estágio, agendar mensagem, exportar, taggear).

**LeadTimelineModal**
- Layout 2 colunas: esquerda = perfil + ações rápidas (assign, próximo task, schedule msg, mover stage), direita = timeline unificada (notas, vouchers, visitas, ratings, msgs, tasks, atribuições) com filtros por tipo.
- Ação "Resumo do lead" (texto pronto p/ copiar).

**Atalhos teclado**
- `n` nova tarefa · `m` agendar msg · `a` atribuir · `1..5` mover estágio · `/` busca.

**Empty/loading/error states** com ilustrações simples (lucide icons + texto).

---

### Arquivos a criar/editar

**Migrations**
- `add_atendente_role + crm_assignment_queue + crm_assignment_queue_members + crm_notification_prefs + scheduled_messages.error_reason`

**Edge functions**
- `admin-crm/index.ts` (extensão grande: notifications, assign_lead, queue CRUD, mark_scheduled_error, prefs)
- `tourist-actions/index.ts` (hook auto-assign ao criar lead)

**Componentes novos**
- `src/components/admin/crm/TaskCalendar.tsx`
- `src/components/admin/crm/NotificationBell.tsx`
- `src/components/admin/crm/AssignLeadPopover.tsx`
- `src/components/admin/crm/AssignmentQueueSettings.tsx`
- `src/components/admin/crm/CrmSettingsTab.tsx`
- `src/components/admin/crm/NotificationPrefsForm.tsx`

**Editar**
- `AdminLayout.tsx` (bell, role gate)
- `AdminLeadsPage.tsx` (sub-views agenda, settings tab, filtro responsável, atalhos)
- `LeadCard.tsx` / `LeadTimelineModal.tsx` (owner, ações, atribuição)
- `VirtualLeadList.tsx` (seleção múltipla, colunas)
- `ScheduledQueue.tsx` (4 abas, status badges, retry)
- `TasksPanel.tsx` (link p/ calendário)
- `useAdminAuth.ts` (role atendente)
- `AdminStaffPage.tsx` (opção atendente)
- `AdminSettingsPage.tsx` (tab notif. CRM)
- `src/integrations/supabase/types.ts` (auto)

---

### Restrições mantidas
- Light mode global.
- Toda escrita via Edge Functions auth (RLS bloqueia direto).
- WhatsApp = `wa.me` manual (sem API oficial).
- Isolamento `winery_id` em todas as queries.
- Nenhuma chamada a IA Gateway adicionada.

Tudo isso vira a entrega em uma única leva. Após aprovação eu rodo a migration, escrevo o código e ajusto types.