# Bloco Ajustes Finos

Seis itens listados anteriormente, escopados de forma pragmática para serem entregues juntos.

---

## 1. Logs de auditoria

**Banco:** nova tabela `audit_logs` (winery_id, admin_id, entity, entity_id, action, before, after, created_at).

**Hook universal:** helper `logAudit()` em `_shared/audit.ts` chamado a partir das principais edge functions (admin-wines mutações, admin-stock adjust/bulk, admin-finance N/A, admin-loyalty mutações, admin-events upsert/delete, admin-leads stage change, admin-winery-config update).

**UI:** nova página `/admin/:slug/audit` com tabela filtrada por entidade/admin/data + exportar CSV. Capability `audit.view` (owner+).

---

## 2. Integrações externas (links públicos)

Sem OAuth — apenas links e exibição.

**Banco:** adicionar em `wineries` colunas `google_business_url`, `tripadvisor_url`, `facebook_url`, `youtube_url` (instagram_url já existe).

**UI admin:** seção "Redes & Reviews externas" em `AdminWineryConfigPage`.

**UI turista:** rodapé com ícones clicáveis quando preenchidos. Card "Avalie no Google/TripAdvisor" no fim do fluxo NPS.

---

## 3. Relatório mensal em PDF

Geração on-demand no Dashboard. Sem agendamento por email (ficaria pra um cronjob futuro).

**Cliente:** botão "Exportar relatório PDF" no `AdminDashboardPage`. Usa `jspdf` (instalar). Inclui KPIs do mês: receita por canal, leads, NPS, top vinhos, top vouchers.

**Dados:** já vêm de `admin-finance` + `admin-dashboard` existentes; agrega no front.

---

## 4. Fichas técnicas em PDF (por vinho)

**Cliente:** botão "Ficha técnica PDF" no card de cada vinho em `AdminWinesPage` e em `WineDetailModal` do turista. Usa o mesmo `jspdf`.

Conteúdo: nome, ano, tipo, uva, região, enólogo, teor alcoólico, temperatura, harmonização, notas aromáticas, descrição, foto. Layout: cabeçalho colorido com primary_color, logo da vinícola, QR para a página pública do vinho.

---

## 5. Multi-idioma — revisão por campo

Sem reescrever a infra de tradução automática (Gemini). Apenas tornar visível.

**UI:** em `AdminWinesPage` (e similares com tradução), abrir drawer "Traduções" que carrega o conteúdo traduzido para EN/ES (já cacheado pelo sistema atual), permite editar e salvar override em nova coluna `wines.translations jsonb` (override manual prevalece sobre IA).

Como impacto é maior, **entrego apenas em Vinhos** nesta passada — padrão replicável.

---

## 6. App de check-in do sommelier

Página `/admin/:slug/checkin` otimizada para celular: 2 passos rápidos.

1. Capturar lead (nome + WhatsApp + ponto de captura) — cria `users_leads` se novo.
2. Emitir voucher: seleção rápida de pacote ou vinho + total + gerar QR.

Reaproveita edge functions `tourist-actions` (criar voucher) e admin-leads. Layout grande, botões altos (44px+), modo offline-first com fila se sem rede (best-effort: salva no localStorage até reconectar).

Capability: `vouchers.issue` (staff+).

---

## Ordem de execução
1. Migration: `audit_logs`, colunas externas em `wineries`, `wines.translations`.
2. `_shared/audit.ts` + integrar em 4-5 edge functions críticas.
3. Edge function `admin-audit` (list + filtros).
4. Instalar `jspdf`.
5. Páginas/UI:
   - `AdminAuditPage` + rota + nav (capability owner)
   - Botão PDF relatório no Dashboard
   - Botão PDF ficha em AdminWinesPage
   - Drawer traduções em AdminWinesPage
   - `AdminCheckinPage` mobile-first + rota + nav (capability vouchers.issue)
   - Campos externos em `AdminWineryConfigPage`
   - Ícones de redes em `TouristLayout` footer

## Fora deste bloco
- Cron de envio email mensal automático (precisa scheduler + email infra).
- Sincronização real-time com Google Reviews / TripAdvisor (precisa API key paga).
- Tradução manual em Pacotes/Cardápio/Eventos (replicável depois do template em Vinhos).
