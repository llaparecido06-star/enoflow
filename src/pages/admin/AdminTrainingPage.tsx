import { Rocket, QrCode, ShoppingCart, MessageSquare, CheckCircle } from "lucide-react";

export default function AdminTrainingPage() {
  return (
    <div>
      <div className="mb-6">
        <h1 className="font-display text-2xl font-bold text-foreground flex items-center gap-2">
          <Rocket className="w-6 h-6 text-accent" />
          Treinamento Rápido
        </h1>
        <p className="text-sm text-muted-foreground">Guia prático para a equipe de linha de frente</p>
      </div>

      <div className="grid gap-6">
        {/* Script do Sommelier */}
        <div className="bg-card rounded-xl border border-border overflow-hidden">
          <div className="px-5 py-4 border-b border-border bg-primary/5 flex items-center gap-3">
            <MessageSquare className="w-5 h-5 text-primary" />
            <h2 className="font-display text-base font-semibold text-foreground">Script de Abordagem do Sommelier</h2>
          </div>
          <div className="p-5 space-y-4">
            <div className="bg-secondary/50 rounded-lg p-4 border-l-4 border-accent">
              <p className="text-sm text-foreground italic leading-relaxed">
                "Olá! Para a degustação de hoje, escaneie este QR Code com a câmera do seu celular. 
                Você vai avaliar os vinhos e nosso <strong>Sommelier Digital</strong> vai descobrir seu perfil — 
                e liberar <strong>10% de desconto</strong> na loja no final!"
              </p>
            </div>

            <div className="space-y-2">
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Dicas importantes</h3>
              <ul className="space-y-2">
                {[
                  "Mostre o QR Code impresso na mesa ou no display ao lado dos vinhos",
                  "Explique que é rápido: menos de 2 minutos para avaliar",
                  "Mencione o desconto — é o maior motivador para o visitante participar",
                  "Se o cliente tiver dificuldade, ajude-o a acessar o link manualmente",
                ].map((tip, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-foreground/80">
                    <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 shrink-0" />
                    {tip}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        {/* Passo a Passo do Caixa */}
        <div className="bg-card rounded-xl border border-border overflow-hidden">
          <div className="px-5 py-4 border-b border-border bg-accent/5 flex items-center gap-3">
            <ShoppingCart className="w-5 h-5 text-accent" />
            <h2 className="font-display text-base font-semibold text-foreground">Passo a Passo do Caixa</h2>
          </div>
          <div className="p-5">
            <p className="text-xs text-muted-foreground mb-4">Como validar um voucher em menos de 10 segundos:</p>
            <div className="space-y-3">
              {[
                {
                  step: 1,
                  title: "Cliente apresenta o QR Code",
                  desc: "O cliente mostra o código na tela do celular ou informa o código manualmente (ex: #GOIS-12).",
                },
                {
                  step: 2,
                  title: "Acesse a aba Vouchers no painel",
                  desc: "No menu lateral, clique em 'Config.' e acesse a seção de validação de vouchers.",
                },
                {
                  step: 3,
                  title: "Escaneie ou digite o código",
                  desc: "Use a câmera do dispositivo para ler o QR Code, ou digite o código manual no campo de busca.",
                },
                {
                  step: 4,
                  title: "Confirme e finalize",
                  desc: "Verifique o valor do desconto, aplique na venda e marque o voucher como 'Resgatado'. Pronto!",
                },
              ].map((item) => (
                <div key={item.step} className="flex gap-3">
                  <div className="w-8 h-8 rounded-full bg-accent/10 flex items-center justify-center shrink-0">
                    <span className="text-sm font-bold text-accent">{item.step}</span>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">{item.title}</p>
                    <p className="text-xs text-muted-foreground">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Quick Reference */}
        <div className="bg-card rounded-xl border border-border p-5">
          <div className="flex items-center gap-2 mb-3">
            <QrCode className="w-5 h-5 text-primary" />
            <h2 className="font-display text-base font-semibold text-foreground">Referência Rápida</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
            <div className="bg-secondary/30 rounded-lg p-3">
              <p className="font-medium text-foreground mb-1">🍷 Degustação</p>
              <p className="text-xs text-muted-foreground">Cliente avalia → recebe persona → ganha voucher</p>
            </div>
            <div className="bg-secondary/30 rounded-lg p-3">
              <p className="font-medium text-foreground mb-1">🛍️ Loja</p>
              <p className="text-xs text-muted-foreground">Cliente mostra QR → caixa valida → desconto aplicado</p>
            </div>
            <div className="bg-secondary/30 rounded-lg p-3">
              <p className="font-medium text-foreground mb-1">📱 Pós-venda</p>
              <p className="text-xs text-muted-foreground">D+1: mensagem de agradecimento · D+15: oferta especial</p>
            </div>
            <div className="bg-secondary/30 rounded-lg p-3">
              <p className="font-medium text-foreground mb-1">🔒 LGPD</p>
              <p className="text-xs text-muted-foreground">Cliente aceita termos no cadastro · dados protegidos por vinícola</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
