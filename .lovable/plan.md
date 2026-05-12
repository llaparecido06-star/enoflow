# Bloco Médio Impacto + Permissões por Cargo

Sequência: (1) Reviews & NPS, (2) Fidelidade, (3) Eventos, (4) Importação CSV, (5) Permissões por cargo.

---

## 1. Reviews & NPS consolidado

**Banco:**
- Nova tabela `wine_reviews` (winery_id, wine_id, user_id, stars 1–5, comment, public_response, responded_by, responded_at, created_at).
- Aproveitar `vouchers.nps_score` já existente para NPS de visita.
- Nova tabela `nps_responses` (winery_id, voucher_id, user_id, score, comment, created_at) para registrar comentário aberto pós-NPS (hoje só temos score).

**Edge function `admin-reviews`:** list_wine_reviews, respond_review, list_nps, nps_summary (NPS = promotores−detratores), low_score_alerts.

**UI `/admin/:slug/reviews`:**
- Cards: NPS geral, total avaliações de vinhos, média de estrelas, alertas (score ≤ 6).
- Tabs: "Vinhos" (lista com filtro por vinho, média, comentários, botão "Responder publicamente") e "Visita / NPS" (lista voucher → score → comentário).

**Tourist:** adicionar campo opcional de comentário no fluxo de rating já existente e na tela de NPS pós-visita.

---

## 2. Fidelidade / Pontos

**Banco:**
- `loyalty_rewards` já existe → expandir com `points_cost`, `active`, `image_url`, `category`.
- Nova tabela `loyalty_tiers` (winery_id, name, min_points, perks jsonb, color).
- Nova tabela `loyalty_redemptions` (winery_id, user_id, reward_id, points_spent, status, created_at, redeemed_at).

**Edge function `admin-loyalty`:** crud_rewards, crud_tiers, list_redemptions, approve_redemption, points_rules (config: pontos por R$, por visita, por indicação — salva em `wineries.business_hours`-like jsonb `loyalty_rules`).

**UI `/admin/:slug/loyalty`:** abas Recompensas, Níveis (Bronze/Prata/Ouro custom), Regras (pontos por R$, visita, indicação), Resgates pendentes.

**Tourist:** vitrine "Programa de Fidelidade" mostrando saldo, nível atual, próximas recompensas (resgate via wa.me para sommelier).

---

## 3. Eventos

**Banco:**
- Nova tabela `events` (winery_id, capture_point_id, title, description, cover_url, starts_at, ends_at, capacity, price, status, rsvp_count).
- Nova tabela `event_rsvps` (event_id, winery_id, lead_id, contact_name, contact_whatsapp, party_size, status, created_at).

**Edge function `admin-events`:** crud_events, list_rsvps, confirm_rsvp, cancel_rsvp, export_csv. Cada RSVP cria/atualiza lead em `users_leads` automaticamente (mesmo padrão do CRM).

**UI `/admin/:slug/events`:** lista de eventos (passado/futuro), criar evento, página de RSVPs por evento.

**Tourist:** rota pública `/winery/:slug/events` e card "Próximos eventos" no portal do turista.

---

## 4. Importação CSV em massa

**Edge function `admin-import`:** action `import_wines` (validar headers, dry-run, retornar erros linha a linha), `import_leads` (histórico CRM), `import_menu`. Tudo via JSON parseado no front (papaparse já comum no stack — se ausente, instalar).

**UI `/admin/:slug/import`:** wizard 3 passos (upload → preview/validação → confirmar). Templates CSV para download por entidade.

---

## 5. Permissões por cargo (ajuste fino)

**Mapeamento atualizado** (roles existentes: master, dono→owner, gerente→manager, funcionario→staff):

| Módulo | dono | gerente | funcionario |
|---|---|---|---|
| Dashboard / KPIs | ✅ | ✅ | ⚠️ próprio |
| Vinhos / Pacotes / Cardápio | ✅ | ✅ | 👁️ leitura |
| **Estoque (ajuste)** | ✅ | ✅ | ⚠️ apenas +/− venda |
| **Financeiro** | ✅ | ✅ | ❌ |
| **Reservas** | ✅ | ✅ | ✅ (atribuídas) |
| CRM | ✅ | ✅ | ⚠️ leads atribuídos |
| **Reviews/NPS** | ✅ | ✅ | 👁️ |
| **Fidelidade** | ✅ | ✅ | 👁️ |
| **Eventos** | ✅ | ✅ | ⚠️ RSVPs |
| **Importação CSV** | ✅ | ❌ | ❌ |
| Equipe | ✅ | ⚠️ funcionários | ❌ |
| Campanhas | ✅ | ✅ | ❌ |
| Vouchers | ✅ | ✅ | ✅ emitir |
| Config. vinícola | ✅ | ⚠️ horários/contato | ❌ |
| Treinamento | ✅ | ✅ | ✅ |

**Implementação:**
- Criar `src/lib/admin/permissions.ts` com matriz acima e helper `can(role, capability)`.
- Atualizar `AdminLayout` sidebar/bottom-nav para esconder itens conforme `can()`.
- Cada Edge function valida `requireCapability(role, capability)` em `_shared/auth.ts`.
- Página `/admin/:slug/team` mostra matriz somente leitura para o dono visualizar.

---

## Ordem de execução

1. Migration única com todas as tabelas + colunas extras.
2. `permissions.ts` + atualização de `_shared/auth.ts`.
3. 4 Edge functions novas (`admin-reviews`, `admin-loyalty`, `admin-events`, `admin-import`).
4. 4 páginas admin + integração tourist (eventos, fidelidade, review com comentário).
5. Sidebar/bottom-nav + matriz visível em Equipe.

## Fora deste bloco
Ajustes finos (logs auditoria, integrações externas, PDF mensal, fichas técnicas PDF, multi-idioma UI por campo, app sommelier) ficam para o próximo ciclo.
