export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-background py-12 px-4">
      <article className="max-w-2xl mx-auto prose prose-sm dark:prose-invert">
        <h1 className="font-display text-2xl font-bold text-foreground mb-6">Termos de Privacidade e Proteção de Dados</h1>

        <p className="text-muted-foreground text-xs mb-4">Última atualização: Fevereiro de 2026</p>

        <section className="space-y-4 text-sm text-foreground/80">
          <h2 className="font-display text-lg font-semibold text-foreground">1. Dados Coletados</h2>
          <p>
            Coletamos seu <strong>nome</strong> e <strong>número de WhatsApp</strong> exclusivamente para personalizar sua experiência de degustação, 
            gerar vouchers de desconto e enviar comunicações sobre ofertas e novidades da vinícola visitada.
          </p>

          <h2 className="font-display text-lg font-semibold text-foreground">2. Finalidade</h2>
          <ul className="list-disc pl-4 space-y-1">
            <li>Identificação durante a experiência de degustação</li>
            <li>Envio de vouchers e promoções via WhatsApp</li>
            <li>Análises internas de preferências (Wine Persona)</li>
            <li>Comunicações de pós-venda (D+1, D+15)</li>
          </ul>

          <h2 className="font-display text-lg font-semibold text-foreground">3. Base Legal (LGPD)</h2>
          <p>
            O tratamento dos seus dados pessoais é realizado com base no seu <strong>consentimento</strong> (Art. 7º, I da Lei 13.709/2018 — LGPD), 
            fornecido de forma livre, informada e inequívoca no momento do cadastro.
          </p>

          <h2 className="font-display text-lg font-semibold text-foreground">4. Compartilhamento</h2>
          <p>
            Seus dados são acessíveis <strong>apenas pela vinícola na qual você se cadastrou</strong>. Não compartilhamos dados com terceiros 
            ou entre vinícolas diferentes (isolamento multitenant).
          </p>

          <h2 className="font-display text-lg font-semibold text-foreground">5. Retenção</h2>
          <p>
            Seus dados são mantidos enquanto houver relação com a vinícola ou até você solicitar a exclusão.
          </p>

          <h2 className="font-display text-lg font-semibold text-foreground">6. Seus Direitos (Opt-out)</h2>
          <p>Você tem direito a:</p>
          <ul className="list-disc pl-4 space-y-1">
            <li><strong>Acessar</strong> seus dados pessoais</li>
            <li><strong>Corrigir</strong> dados incompletos ou desatualizados</li>
            <li><strong>Solicitar exclusão</strong> dos seus dados</li>
            <li><strong>Revogar o consentimento</strong> a qualquer momento</li>
          </ul>
          <p>
            Para exercer qualquer direito, entre em contato diretamente com a vinícola onde realizou o cadastro 
            ou envie um e-mail para o responsável indicado no local.
          </p>

          <h2 className="font-display text-lg font-semibold text-foreground">7. Segurança</h2>
          <p>
            Utilizamos criptografia, controle de acesso por JWT e políticas de segurança em nível de linha (RLS) 
            para garantir que seus dados estejam protegidos contra acessos não autorizados.
          </p>
        </section>
      </article>
    </div>
  );
}
