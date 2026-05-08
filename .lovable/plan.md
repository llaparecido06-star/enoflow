# CRM Admin — Versão Definitiva

Transformar o CRM em uma ferramenta de trabalho diária para a vinícola, capaz de operar com milhares de leads sem perda de performance, com segmentação salva, agenda de follow-ups, lembretes e mensagens agendadas.

---

## 1. Visualização "Lista" performática (paginação + virtualização)

Hoje a aba lista renderiza todos os leads de uma vez. Vamos reescrever:

- **Busca** por nome / WhatsApp (debounce 300ms) — preserva estado entre abas
- **Filtros rápidos**: estágio, persona, tag, responsável, ticket mín, recência
- **Virtualização** com `@tanstack/react-virtual` (já é leve, sem nova dependência pesada) — renderiza apenas as linhas visíveis, suporta 10k+ leads sem travar
- **Paginação no servidor** (limite 200 por página + cursor) na edge `admin-crm` ação `list_leads_paginated` para evitar trafegar tudo
- **Estado persistido** no `sessionStorage` por vinícola (filtros + busca) — voltar para a aba mantém o que estava

Cards densificados na lista: nome, persona, estágio, responsável, próximo follow-up, último contato, LTV.

## 2. Aba "Segmentos"

Nova aba dedicada que usa `crm_saved_segments` (já existe).

- Construtor visual de filtros combináveis (AND): persona, faixa etária, gênero, classe de renda, ticket, NPS, recência, frequência, tags, estágio, vinhos favoritos, tem voucher pendente, tem aniversário no mês
- **Salvar** segmento com nome → reaplica em 1 clique no Funil OU na Lista
- **Ações em massa** sobre o segmento atual: aplicar tag, mover de estágio, atribuir responsável, exportar CSV, **enviar campanha WhatsApp em lote** (já existe BulkSendModal — reutilizar)
- Lista lateral de segmentos salvos com contador "X leads agora"

## 3. Tarefas, follow-ups e lembretes (novo coração do CRM)

Hoje o CRM só registra histórico. Vinícola precisa de **agenda viva**.

Nova tabela `crm_tasks`:
```text
id, winery_id, lead_id, admin_id (responsável),
title, description, due_at, status (pendente|feito|cancelado),
type (followup|ligacao|whatsapp|visita|outro),
created_by, created_at, completed_at
```

Recursos:
- Botão "Agendar follow-up" no card do lead e na timeline 360° → cria tarefa com data/hora e responsável
- **Painel "Hoje / Atrasadas / Próximas"** no topo do CRM com badge de contagem
- **Bell de notificações** no AdminLayout mostrando tarefas vencidas + criadas para o admin logado (poll a cada 60s)
- Marcar tarefa como concluída registra na timeline do lead automaticamente
- Fila inicial: tarefa criada automaticamente quando lead muda para "Contatado" sem follow-up nos últimos 7 dias (regra opcional configurável)

## 4. Mensagens agendadas

Hoje envio em lote é manual e imediato. Adicionar:

Nova tabela `crm_scheduled_messages`:
```text
id, winery_id, lead_id, template_id, body_resolved,
scheduled_for, status (pendente|enviada|cancelada|falhou),
created_by, created_at, sent_at
```

- Modal "Agendar envio" no BulkSendModal e no card do lead: escolhe template + data/hora
- **Edge function cron** `process-crm-scheduled` (a cada 5 min via `pg_cron`) gera log e marca como pendente de envio manual — ao atingir o horário aparece no painel "Para enviar agora" com 1 clique abre `wa.me` e marca como enviada
- Memória `marketing-campaigns` exige envio manual via `wa.me` com delay → mantemos esse princípio: o agendamento prepara a fila, o admin aciona

## 5. Pipeline polido

- Estimativa de receita por estágio no header
- Filtro do Funil por responsável e por segmento salvo
- Drag-and-drop com confirmação para "Convertido" e "Perdido" (opcional motivo de perda — gravado em `crm_lead_state.tags` ou novo campo `lost_reason`)
- Cards mostram badge "⚠️ X dias parado" quando lead estagnou >7 dias num estágio não-final
- Indicador de tarefa pendente no card (📅 hoje / atrasada)

## 6. Notas e timeline ricas

Já temos notas e log de mensagens. Adicionar:
- Notas com **tags de menção** simples (#vip, #aniversario) que viram filtros
- Linha do tempo unificada já existe — adicionar entradas de tarefas concluídas e mensagens agendadas
- Botão "Copiar resumo do lead" para colar em conversas internas

---

## Implementação (ordem)

```text
1. Migração: crm_tasks + crm_scheduled_messages + lost_reason em crm_lead_state
   + RLS "no direct" + cron job opcional para scheduled
2. Edge admin-crm: novas ações (list_leads_paginated, list_tasks, upsert_task,
   complete_task, list_scheduled, schedule_message, cancel_scheduled,
   pending_to_send, mark_message_sent, query_segment, save_segment)
3. UI:
   - VirtualLeadList.tsx (virtualização + busca + filtros + paginação)
   - SegmentsTab.tsx (construtor + segmentos salvos)
   - TasksPanel.tsx (Hoje/Atrasadas/Próximas) integrado no topo do CRM
   - ScheduleMessageModal.tsx
   - TaskFormModal.tsx
   - Bell de tarefas no AdminLayout
4. Polimento: indicadores no card do funil, motivo de perda, persistência
   de estado em sessionStorage
```

## Notas técnicas

- Virtualização: `@tanstack/react-virtual` (~3kb) — mais simples que react-window e combina bem com tabelas
- Toda escrita continua passando por edge function (RLS bloqueia direto)
- Light mode + isolamento por `winery_id` mantidos
- Sem nova dependência de envio de mensagem: tudo continua via `wa.me` (memória respeitada)
- AI Gateway não é usado neste módulo (admin-only, sem conteúdo gerado)

Aprove para eu começar pela migração do banco e seguir reto até o fim.