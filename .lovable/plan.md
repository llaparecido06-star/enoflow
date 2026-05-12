
# Bloco Crítico — 4 módulos novos no Admin

Vou implementar os 4 módulos críticos em sequência, no mesmo bloco. Cada módulo segue o padrão já existente (Edge Function `_shared/auth.ts`, RLS bloqueada + actions, light mode, isolamento por `winery_id`, mobile-first).

---

## 1. Reservas & Agendamentos

**Objetivo:** captar e gerenciar reservas de degustação/visita com horário, capacidade e sommelier responsável.

**Banco** — novas tabelas:
- `reservation_slots` — `winery_id`, `capture_point_id`, `weekday` (0-6), `start_time`, `end_time`, `capacity`, `price` (opcional), `active`
- `reservations` — `winery_id`, `lead_id` (FK lógico → `users_leads`), `slot_id`, `scheduled_at` (timestamptz), `party_size`, `status` (`pendente`/`confirmada`/`cancelada`/`compareceu`/`noshow`), `assigned_admin_id`, `notes`, `source` (`admin`/`tourist`/`whatsapp`)

**UI Admin:**
- Nova aba `/admin/:slug/reservations` na sidebar (ícone CalendarCheck)
- Sub-views: **Hoje** (lista cronológica), **Semana** (grade horários × dias), **Configurar slots** (recorrência semanal por ponto de captura)
- Card de reserva: nome, telefone, party_size, sommelier, status, ações (confirmar, marcar comparecimento, cancelar, abrir lead no CRM)
- Integração CRM: ao criar reserva o lead vira `qualificado`; comparecimento gera entry no timeline

**UI Turista (mini):** botão "Reservar visita" no `/v/:slug` que abre modal com slots disponíveis, cria reserva + lead. (Implementação tourista enxuta — só captura, sem pagamento.)

**Edge function:** `admin-reservations` com actions `list_slots`, `upsert_slot`, `delete_slot`, `list_reservations`, `create_reservation`, `update_status`, `assign`, `available_slots` (pública para turista).

---

## 2. Estoque de Vinhos

**Objetivo:** controle de garrafas por vinho, alertas de ruptura, baixa automática ao gerar voucher.

**Banco:**
- Adicionar em `wines`: `stock_qty` (int, default 0), `stock_min` (int, default 0), `track_stock` (bool, default false)
- `stock_movements` — `winery_id`, `wine_id`, `delta` (int, pode ser negativo), `reason` (`entrada`/`venda`/`ajuste`/`perda`/`devolucao`), `voucher_id` (nullable), `admin_id`, `note`

**UI Admin:**
- Nova aba **Estoque** dentro de `AdminWinesPage` (ou rota dedicada `/admin/:slug/stock`)
- Tabela com: vinho, qty atual, mínimo, status (OK/Baixo/Esgotado), ações rápidas (+/− com motivo, ajuste manual)
- Modal "Entrada de estoque" (compra/produção) e "Baixa manual"
- Filtros: só com track_stock, status do estoque
- Histórico de movimentos por vinho

**Automação:** ao gerar voucher (em `tourist-actions`), debitar `stock_qty` dos itens vendidos quando `track_stock=true`. Se zerar, bloquear venda futura e disparar toast no painel admin via NotificationBell (nova bucket `low_stock`).

**Edge function:** `admin-stock` com `list_stock`, `adjust`, `bulk_entry`, `movements`, `set_tracking`.

---

## 3. Financeiro / Faturamento

**Objetivo:** consolidar receita por canal e período, comissão da plataforma e exportação contábil.

**Banco:** sem tabela nova — derivar de `vouchers.items` + `vouchers.total` + `wines.on_tasting/on_restaurant/on_shop`. Adicionar coluna `vouchers.channel` (`tasting`/`restaurant`/`shop`/`mixed`) preenchida no momento da geração para evitar recálculo.

**UI Admin:**
- Nova aba `/admin/:slug/finance` (ícone DollarSign, role ≥ manager)
- KPIs topo: Receita do mês, Ticket médio, Vouchers resgatados, Comissão plataforma
- Gráfico por canal (degustação/restaurante/loja) — usar recharts já no projeto
- Tabela de movimentos: data, voucher, canal, total, status (resgatado/pendente), comissão
- Filtros: período, canal, status
- Exportação CSV/PDF contábil (CSV primeiro; PDF fica para "ajustes finos")

**Edge function:** `admin-finance` com `summary`, `transactions`, `export_csv`.

---

## 4. Configurações da Vinícola (página unificada)

**Objetivo:** uma única tela para o dono editar identidade, idiomas, moeda, horários e LGPD.

**Banco:** adicionar em `wineries`:
- `business_hours` (jsonb) — `{ "mon": "09:00-18:00", "tue": "...", ... }`
- `contact_phone`, `contact_email`, `address`, `instagram_url`
- `lgpd_policy_url` (já há política no fluxo, falta campo na vinícola)
- `default_language` (text, default 'pt-BR'), `supported_languages` (text[])

**UI Admin:**
- Nova rota `/admin/:slug/settings-winery` (substitui parte do que hoje está em `/settings` que é Vouchers — renomeio aquele para "Vouchers" e crio "Configurações")
- Seções colapsáveis:
  - Identidade (logo, primary_color, nome, slug — readonly)
  - Contato (telefone, email, endereço, Instagram)
  - Horários de funcionamento (7 inputs)
  - Idiomas e moeda
  - LGPD (link da política, texto exibido no login)
- Salvar parcial por seção (botão por bloco) para evitar formulário gigante

**Edge function:** atualizar `admin-wineries` (ou criar `admin-winery-config`) com `get_config`, `update_config`.

---

## Navegação consolidada

Sidebar após este bloco (PC + mobile sheet):
```
Dashboard · Vinhos · Estoque · Pacotes · Cardápio · Reservas · CRM (Leads)
Equipe · Pontos · Campanhas · Vouchers · Financeiro · Configurações · Treinamento
```

Mobile bottom nav permanece com 4 primários + "Mais" — adiciono **Reservas** ao topo de prioridade (alto valor diário).

---

## Ordem de entrega neste bloco

1. Migration única com todas as tabelas + colunas novas
2. Edge functions (`admin-reservations`, `admin-stock`, `admin-finance`, extensão `admin-wineries`)
3. UI Admin de cada módulo
4. Hook do voucher para debitar estoque automaticamente
5. Adicionar low_stock no NotificationBell

**Fora deste bloco** (vão para o intermediário): Reviews/NPS dashboard, Fidelidade UI, Eventos, Importação CSV. **Fora dos ajustes finos:** logs de auditoria, integrações externas, PDF mensal automático, fichas técnicas PDF, multi-idioma UI, app sommelier mobile.

Aprova para eu começar?
