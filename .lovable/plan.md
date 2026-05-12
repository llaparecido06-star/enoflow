## CRM Pro — Finalização Hubspot-grade

Esta é a rodada final que fecha todas as pontas em aberto do CRM e da experiência admin. Tudo segue o padrão atual: Edge Functions com `_shared/auth.ts`, light mode, isolamento por `winery_id`, WhatsApp por `wa.me`.

---

### 1. Exportação CSV de pós-venda (D+1 / D+15)

**Onde**: Aba "Pós-venda" do CRM (já existe na página de Leads) e Dashboard Admin.

- Novo componente `PostSaleExportBar.tsx` com:
  - Date range picker (período)
  - Multi-select de status: D+1 enviado, D+15 enviado, NPS respondido, voucher resgatado, sem retorno
  - Botão **Exportar CSV** → chama `admin-crm.export_postsale`
- Edge action `export_postsale` retorna CSV (text/csv) com colunas: nome, whatsapp, data visita, voucher_code, total, nps, status_d1, status_d15, observações.
- Download client-side via Blob.

### 2. Notificações e preferências por funcionário

**DB**: tabela `crm_notification_prefs` já existe.

- Nova aba **Notificações** dentro de `AdminLeadsPage` (sub-tab em Configurações) para staff individual:
  - Frequência do digest (off / 5min / 15min / 1h / digest diário)
  - Quiet hours (start/end inteiros 0–23)
  - Toggles: tarefas atrasadas, mensagens prontas, leads novos sem dono
- `admin-crm.get_prefs` / `update_prefs` (já existem) + UI completa.
- `NotificationBell` respeita quiet hours (não pisca, só acumula badge).
- Badge por staff: contagem persistida em `localStorage` com `lastSeenAt`.
- Toast `sonner` para alertas urgentes (tarefa vencida agora, msg pronta) só fora do quiet hours.

### 3. Calendário CRUD com drag-and-drop

Em `TaskCalendar.tsx`:

- Visão **Semana** ganha grade por hora (07h–22h).
- Drag-and-drop nativo HTML5 (sem libs novas):
  - Arrastar task entre dias → atualiza `due_at` (mantém hora original)
  - Arrastar entre slots de hora (na visão semana) → atualiza data+hora
  - Visual: opacidade no drag, slot destaca ao hover
- Click no card → abre `TaskFormModal` (edição completa)
- Botão **+** em cada dia/slot → cria com preset (já parcial; concluir)
- Suporta mensagens agendadas (`crm_scheduled_messages`) como itens do calendário com ícone diferente; drag move `scheduled_for`.
- Nova edge action `move_task` (valida winery_id + ownership) e `reschedule_message`.

### 4. ScheduledQueue — filtros avançados + ações em lote

Em `ScheduledQueue.tsx`:

- Barra de filtros: busca livre (texto/whatsapp/nome), select de atendente, date range, status (já existe).
- Coluna de checkbox por linha + "Selecionar todos" da aba ativa.
- Barra fixa de ação em massa no rodapé quando ≥1 selecionada:
  - **Enviar agora (abrir wa.me em sequência)** com confirm modal
  - **Cancelar selecionadas**
  - **Marcar como erro em massa** (com motivo)
  - **Reatribuir atendente** (só dono/gerente)
- Edge actions novas: `bulk_cancel_scheduled`, `bulk_mark_error`, `bulk_reassign_scheduled`.

### 5. Lembretes automáticos (recorrência)

- `NotificationBell` faz polling 60s em `admin-crm.notifications`.
- Backend retorna 3 buckets: `overdue_tasks`, `ready_messages`, `unassigned_leads`.
- Front mantém `lastNotifiedAt` por bucket no localStorage; respeita `digest_frequency` da preferência:
  - off → só badge (sem toast)
  - 5min/15min/1h/diário → toast sonner se passou o intervalo
- Badge no item do sidebar "Leads" com a contagem total.

### 6. Auto-assign de lead via QR code

Já há esqueleto em `session-auth/index.ts`. Vamos:

- Mover a lógica para helper `pickNextAssignee(supabase, winery_id)` em `_shared/auth.ts` (ou novo `_shared/crm.ts`).
- Garantir chamada em **dois pontos**:
  1. `session-auth` (signup tourist via QR) — já está
  2. `tourist-actions.register_lead` (fluxo do app via QR) — adicionar
- Modos: `round_robin` (sequencial via `last_assigned_admin_id`) e `load_balanced` (admin ativo com menos leads abertos).
- Após escolher, atualiza `crm_lead_state.assigned_admin_id` + `crm_assignment_queue.last_assigned_admin_id` + grava timeline "Lead atribuído automaticamente a X (via QR <capture_point>)".
- Se queue desabilitada ou sem membros ativos → lead fica sem dono (atendente pode reivindicar).

### 7. Revisão geral do admin (PC + mobile)

**Limpeza de abas**:
- Remover/agrupar abas redundantes:
  - **"Treinamento"** → mover para um item dentro de Configurações (não justifica item primário)
  - **"Locais"** → renomear para "Pontos de Captura" (terminologia consistente com QR codes)
  - **"Performance"** → mantém, mas vira sub-aba de **Equipe** (Equipe / Atividade / Performance)
- Sidebar fica: Dashboard · Vinhos · Pacotes · Cardápio · **Leads (CRM)** · Equipe · Pontos · Campanhas · Vouchers
- Adicionar nova: **Pós-venda** como sub-aba dentro de Leads (não item separado)
- Mover "Configurações" como engrenagem no topo (não item de sidebar)

**Mobile**:
- Bottom nav atual mostra todos os itens em scroll — substituir por: Dashboard · Leads · Vinhos · Mais (sheet com restante).
- Componente `MobileMoreSheet.tsx` (Sheet do shadcn) listando os itens secundários.
- Header mobile: nome da vinícola + sino + avatar (menu com Sair).
- Conteúdo: `pb-24` em mobile para folga; `LeadCard` mais compacto em <768px (já parcial).

**PC**:
- Sidebar permanece, com ícones consistentes (lucide).
- Header com breadcrumb (`Vinícola › Leads › Pipeline`) e sino + avatar à direita.
- Larguras max-w-7xl para conteúdo, padding consistente.

**Atendente (sales)**:
- Sidebar mostra só: Leads, e dentro de leads vê Pipeline/Lista/Agenda/Pós-venda (sem Configurações/Segmentos/Templates).
- No mobile, bottom nav só com Leads + Sair.

---

### Arquivos

**Edge functions**
- `admin-crm/index.ts` — adicionar: `export_postsale`, `move_task`, `reschedule_message`, `bulk_cancel_scheduled`, `bulk_mark_error`, `bulk_reassign_scheduled`. Refatorar notifications para retornar buckets.
- `tourist-actions/index.ts` — chamar `pickNextAssignee` em `register_lead`.
- `_shared/crm.ts` — novo helper compartilhado.

**Componentes novos**
- `src/components/admin/crm/PostSaleExportBar.tsx`
- `src/components/admin/crm/NotificationPrefsForm.tsx`
- `src/components/admin/AdminHeader.tsx` (sino + avatar + breadcrumb)
- `src/components/admin/MobileMoreSheet.tsx`

**Componentes editados**
- `src/components/admin/crm/TaskCalendar.tsx` — drag-and-drop, visão semana com slots
- `src/components/admin/crm/ScheduledQueue.tsx` — filtros, seleção múltipla, ações em massa
- `src/components/admin/crm/NotificationBell.tsx` — respeitar prefs e digest
- `src/components/admin/crm/TaskFormModal.tsx` — modo edição
- `src/pages/admin/AdminLayout.tsx` — nova sidebar, header, mobile sheet
- `src/pages/admin/AdminLeadsPage.tsx` — sub-aba Pós-venda + Notificações em Configurações
- `src/pages/admin/AdminStaffPerformancePage.tsx` — virar sub-aba de Equipe (rotear via `AdminStaffPage`)

**Migrations**: nenhuma nova (todas as tabelas já existem).

---

### Restrições mantidas
- Light mode (já enforced).
- Toda escrita via Edge Functions auth.
- WhatsApp via `wa.me`.
- Isolamento `winery_id`.
- Sem novas libs (drag-and-drop nativo HTML5; sonner já instalado).

Após aprovação eu implemento em uma única leva: refator de sidebar + header, calendário com DnD, ScheduledQueue avançada, export CSV, prefs de notificação, auto-assign no `tourist-actions`, e ajuste mobile.
