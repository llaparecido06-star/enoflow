import jsPDF from "jspdf";
import {
  Document, Packer, Paragraph, TextRun, AlignmentType, HeadingLevel, LevelFormat,
} from "docx";
import { saveAs } from "file-saver";

export interface ContractClient {
  legal_name: string;
  trade_name?: string | null;
  cnpj: string;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  zip_code?: string | null;
  responsible_name?: string | null;
  responsible_cpf?: string | null;
  responsible_role?: string | null;
}

export interface ContractData {
  plan_name: string;
  setup_fee: number;
  monthly_fee: number;
  postsales_active: boolean;
  postsales_commission_pct: number;
  start_date?: string | null;
}

const fmtBRL = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const fmtDate = (d?: string | null) => {
  if (!d) return "____ de _________ de _____";
  const dt = new Date(d + "T00:00:00");
  return dt.toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" });
};

const buildAddress = (c: ContractClient) =>
  [c.address, c.city && c.state ? `${c.city} - ${c.state}` : c.city || c.state, c.zip_code]
    .filter(Boolean).join(", ") || "[Endereço completo da vinícola]";

// ─── Sections (shared text) ──────────────────────────────
const sectionsText = (client: ContractClient, data: ContractData) => {
  const status = data.postsales_active
    ? "[ ] INATIVO (Gestão Interna) / [X] ATIVO (Gestão EnoFlow)"
    : "[X] INATIVO (Gestão Interna) / [ ] ATIVO (Gestão EnoFlow)";

  return {
    title: "CONTRATO DE LICENCIAMENTO DE USO DE SOFTWARE E PRESTAÇÃO DE SERVIÇOS TÉCNICOS",
    parties: [
      `CONTRATANTE: ${client.legal_name}${client.trade_name ? ` (${client.trade_name})` : ""}, pessoa coletiva de direito privado, inscrita no CNPJ sob o n.º ${client.cnpj}, com sede em ${buildAddress(client)}, doravante designada simplesmente CONTRATANTE.`,
      `CONTRATADA: 56.185.635 LUCAS DE LIMA APARECIDO, pessoa singular (Microempreendedor Individual), inscrita no CNPJ sob o n.º 56.185.635/0001-65 e CPF n.º 474.972.198-04, com sede na Rua Mazel, 234, Parque São George, no município de Cotia - SP, CEP: 06708-235, doravante designada simplesmente CONTRATADA.`,
      "As partes acima qualificadas celebram o presente contrato, que se regerá pelas cláusulas e condições a seguir:",
    ],
    clauses: [
      {
        h: "CLÁUSULA 1ª – DO OBJETO",
        p: [
          "1.1. O presente contrato tem por objeto o licenciamento do direito de uso da plataforma digital EnoFlow (Software as a Service - SaaS), desenvolvida pela CONTRATADA, em formato White-Label (com a identidade visual da CONTRATANTE).",
          "1.2. Estão incluídos no âmbito da plataforma: o web app de captura de leads (modo turista) acessível via QR Code para qualificação de paladar e digitalização de catálogos, bem como o acesso a um painel web independente (Admin) para a equipa da vinícola realizar a validação de benefícios e visualização de inteligência de dados (BI).",
          "1.3. O sistema operará de forma desacoplada, não havendo obrigatoriedade, nesta fase, de integração via API com o sistema de caixas (ERP) físico da CONTRATANTE.",
        ],
      },
      {
        h: `CLÁUSULA 2ª – DOS VALORES, FORMA DE PAGAMENTO E REAJUSTE (${data.plan_name.toUpperCase()})`,
        p: [
          "Pelo licenciamento da plataforma e implantação, a CONTRATANTE pagará à CONTRATADA os seguintes valores contratuais:",
          `2.1. Taxa de Setup e Implantação: ${fmtBRL(data.setup_fee)}, pagos em parcela única em até 05 (cinco) dias úteis após a assinatura deste contrato.`,
          `2.2. Mensalidade (Licenciamento e Manutenção): ${fmtBRL(data.monthly_fee)} mensais. A primeira parcela terá vencimento 30 (trinta) dias após a entrega do painel em ambiente de produção, e as demais em igual dia dos meses subsequentes.`,
          "2.3. Reajuste Anual: Os valores descritos nesta cláusula serão reajustados anualmente, a cada período de 12 (doze) meses contados a partir da data de assinatura deste contrato, com base na variação positiva acumulada do IPCA (Índice Nacional de Preços ao Consumidor Amplo) do IBGE, ou, na sua falta, por outro índice oficial que venha a substituí-lo.",
        ],
      },
      {
        h: "CLÁUSULA 3ª – DO MÓDULO ADICIONAL DE GESTÃO DE PÓS-VENDA (SERVIÇO OPCIONAL)",
        p: [
          "3.1. A gestão de pós-venda, envio de mensagens e campanhas de remarketing para os leads capturados não fazem parte do \"Plano Base\" de licenciamento de software descrito na Cláusula 2ª.",
          "3.2. Caso a CONTRATANTE opte por realizar o pós-venda com a sua própria equipa interna de atendimento, estará totalmente isenta de qualquer taxa de comissionamento sobre as vendas geradas.",
          "3.3. Ativação Opcional: Caso a CONTRATANTE deseje externalizar o serviço de remarketing para a CONTRATADA (atuando como agência de performance), ativar-se-á o \"Módulo de Gestão de Pós-Venda\".",
          `3.4. Remuneração Exclusiva do Módulo Ativo: Apenas caso o módulo descrito no item 3.3 seja expressamente ativado, a CONTRATADA terá direito a uma comissão de ${data.postsales_commission_pct}% (${data.postsales_commission_pct === 5 ? "cinco" : data.postsales_commission_pct} por cento) exclusivamente sobre as vendas efetivadas no e-commerce da CONTRATANTE que utilizarem o link parametrizado (UTM) ou cupão gerado nas campanhas da CONTRATADA.`,
          `3.5. Status atual: No momento da assinatura deste contrato, o Módulo Adicional encontra-se ${status}.`,
        ],
      },
      {
        h: "CLÁUSULA 4ª – DA PROPRIEDADE INTELECTUAL",
        p: [
          "4.1. Todos os direitos de propriedade intelectual inerentes à plataforma EnoFlow, incluindo, mas não se limitando a, código-fonte, algoritmos, bases de dados estruturais, marcas, logótipos e identidade visual do software original, são e permanecerão de titularidade exclusiva da CONTRATADA.",
          "4.2. O presente contrato concede apenas uma licença de uso limitada, não exclusiva e revogável, não configurando, em nenhuma hipótese, a venda, cedência ou transferência do código-fonte ou dos direitos de autor à CONTRATANTE.",
        ],
      },
      {
        h: "CLÁUSULA 5ª – DO NÍVEL DE SERVIÇO (SLA) E LIMITAÇÃO DE RESPONSABILIDADE",
        p: [
          "5.1. A CONTRATADA compromete-se a envidar os melhores esforços para manter a plataforma acessível e operacional, com um objetivo de disponibilidade (SLA) de 99% (noventa e nove por cento) do tempo mensal.",
          "5.2. A CONTRATADA não será responsabilizada por interrupções no serviço causadas por falhas na ligação à internet nas instalações da CONTRATANTE, problemas nos dispositivos móveis dos utilizadores, ou por indisponibilidade imprevisível de serviços de terceiros (servidores em nuvem e infraestrutura).",
          "5.3. Fica expressamente acordado que a CONTRATADA não será, em caso algum, responsabilizada por lucros cessantes, perda de receitas ou danos indiretos decorrentes de eventuais falhas temporárias na validação de cupões ou leitura de QR Codes.",
        ],
      },
      {
        h: "CLÁUSULA 6ª – DA CONFIDENCIALIDADE E SIGILO",
        p: [
          "6.1. As partes obrigam-se a manter sob rigoroso sigilo todas as informações comerciais, financeiras, estratégicas e dados de clientes a que tenham acesso por força da execução deste contrato.",
          "6.2. É terminantemente proibido à CONTRATADA partilhar, vender ou utilizar a base de dados de clientes capturados nas instalações da CONTRATANTE para beneficiar outras empresas do setor vitivinícola ou terceiros concorrentes, sob pena de rescisão contratual e apuramento de perdas e danos.",
        ],
      },
      {
        h: "CLÁUSULA 7ª – DA PROTEÇÃO DE DADOS (LGPD)",
        p: [
          "7.1. As partes comprometem-se a atuar em estrita conformidade com a Lei Geral de Proteção de Dados (Lei n.º 13.709/2018).",
          "7.2. A CONTRATANTE atua como Controladora dos dados dos turistas capturados, cabendo-lhe as decisões referentes ao tratamento desses dados. A CONTRATADA atua como Operadora, realizando o processamento e armazenamento em ambiente seguro, estritamente conforme as diretrizes deste contrato.",
          "7.3. A aplicação EnoFlow exigirá o consentimento expresso (opt-in) do utilizador final antes da conclusão da captura do lead.",
        ],
      },
      {
        h: "CLÁUSULA 8ª – DO PRAZO E RESCISÃO",
        p: [
          "8.1. O presente contrato é celebrado pelo prazo de 12 (doze) meses, renovando-se automaticamente por iguais períodos, salvo manifestação em contrário.",
          "8.2. O contrato poderá ser rescindido por qualquer uma das partes, a qualquer momento, mediante aviso prévio por escrito de 30 (trinta) dias, sem incidência de multa, devendo ser liquidadas as mensalidades proporcionais até à data do encerramento.",
        ],
      },
      {
        h: "CLÁUSULA 9ª – DO FORO",
        p: ["Fica eleito o foro da Comarca de Cotia - SP para dirimir quaisquer dúvidas oriundas deste contrato."],
      },
    ],
    closing: [
      "E, por estarem assim justas e contratadas, as partes assinam digitalmente o presente instrumento.",
      fmtDate(data.start_date),
    ],
    signatures: [
      `CONTRATANTE: ${client.responsible_name || "[Nome do Representante Legal da Vinícola]"}${client.responsible_role ? ` (${client.responsible_role})` : ""} — CPF: ${client.responsible_cpf || "[000.000.000-00]"}`,
      "CONTRATADA: 56.185.635 LUCAS DE LIMA APARECIDO — CNPJ: 56.185.635/0001-65",
      "TESTEMUNHA 1: __________________________________ CPF: ____________________",
      "TESTEMUNHA 2: __________________________________ CPF: ____________________",
    ],
  };
};

// ─── PDF generator ────────────────────────────────────
export function generateContractPDF(client: ContractClient, data: ContractData) {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const marginX = 56;
  const marginY = 56;
  const maxWidth = pageWidth - marginX * 2;
  let y = marginY;

  const ensureSpace = (h: number) => {
    if (y + h > pageHeight - marginY) {
      doc.addPage();
      y = marginY;
    }
  };

  const writeWrapped = (text: string, opts: { size?: number; bold?: boolean; align?: "left" | "center" | "justify"; gap?: number } = {}) => {
    const size = opts.size ?? 10;
    doc.setFont("helvetica", opts.bold ? "bold" : "normal");
    doc.setFontSize(size);
    const lines = doc.splitTextToSize(text, maxWidth);
    const lineHeight = size * 1.35;
    ensureSpace(lines.length * lineHeight);
    if (opts.align === "center") {
      lines.forEach((l: string) => {
        doc.text(l, pageWidth / 2, y, { align: "center" });
        y += lineHeight;
      });
    } else {
      doc.text(lines, marginX, y, { align: opts.align === "justify" ? "justify" : "left", maxWidth });
      y += lines.length * lineHeight;
    }
    y += opts.gap ?? 6;
  };

  const s = sectionsText(client, data);

  writeWrapped(s.title, { size: 13, bold: true, align: "center", gap: 14 });
  s.parties.forEach((p) => writeWrapped(p, { size: 10, align: "justify", gap: 8 }));

  s.clauses.forEach((c) => {
    writeWrapped(c.h, { size: 11, bold: true, gap: 6 });
    c.p.forEach((p) => writeWrapped(p, { size: 10, align: "justify", gap: 6 }));
    y += 4;
  });

  s.closing.forEach((c) => writeWrapped(c, { size: 10, align: c.startsWith("E,") ? "justify" : "center", gap: 12 }));
  y += 12;
  s.signatures.forEach((sig) => writeWrapped(sig, { size: 10, gap: 16 }));

  doc.save(`Contrato_${client.legal_name.replace(/[^a-zA-Z0-9]/g, "_")}.pdf`);
}

// ─── DOCX generator ───────────────────────────────────
export async function generateContractDOCX(client: ContractClient, data: ContractData) {
  const s = sectionsText(client, data);

  const para = (text: string, bold = false, align: AlignmentType = AlignmentType.JUSTIFIED) =>
    new Paragraph({
      alignment: align,
      spacing: { after: 120 },
      children: [new TextRun({ text, bold, font: "Calibri", size: 22 })],
    });

  const heading = (text: string) =>
    new Paragraph({
      heading: HeadingLevel.HEADING_2,
      spacing: { before: 200, after: 120 },
      children: [new TextRun({ text, bold: true, font: "Calibri", size: 24 })],
    });

  const children: Paragraph[] = [];
  children.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 240 },
      children: [new TextRun({ text: s.title, bold: true, font: "Calibri", size: 28 })],
    }),
  );
  s.parties.forEach((p) => children.push(para(p)));
  s.clauses.forEach((c) => {
    children.push(heading(c.h));
    c.p.forEach((p) => children.push(para(p)));
  });
  s.closing.forEach((c) => children.push(para(c, false, AlignmentType.CENTER)));
  children.push(para(""));
  s.signatures.forEach((sig) => children.push(para(sig, false, AlignmentType.LEFT)));

  const doc = new Document({
    styles: { default: { document: { run: { font: "Calibri", size: 22 } } } },
    sections: [{
      properties: { page: { margin: { top: 1134, right: 1134, bottom: 1134, left: 1134 } } },
      children,
    }],
  });

  const blob = await Packer.toBlob(doc);
  saveAs(blob, `Contrato_${client.legal_name.replace(/[^a-zA-Z0-9]/g, "_")}.docx`);
}
