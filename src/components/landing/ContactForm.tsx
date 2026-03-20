import { useState } from "react";
import { motion } from "framer-motion";
import { Send, Loader2, CheckCircle } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { z } from "zod";

const leadSchema = z.object({
  name: z.string().trim().min(2, "Nome deve ter pelo menos 2 caracteres").max(100),
  email: z.string().trim().email("E-mail inválido").max(255),
  phone: z.string().trim().max(20).optional().or(z.literal("")),
  winery_name: z.string().trim().max(100).optional().or(z.literal("")),
  message: z.string().trim().max(1000).optional().or(z.literal("")),
});

export default function ContactForm() {
  const [form, setForm] = useState({ name: "", email: "", phone: "", winery_name: "", message: "" });
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  const update = (field: string, value: string) => setForm((p) => ({ ...p, [field]: value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const result = leadSchema.safeParse(form);
    if (!result.success) {
      toast({ title: "Erro", description: result.error.issues[0].message, variant: "destructive" });
      return;
    }

    setSending(true);
    const { error } = await supabase.from("landing_leads").insert({
      name: result.data.name,
      email: result.data.email,
      phone: result.data.phone || null,
      winery_name: result.data.winery_name || null,
      message: result.data.message || null,
    });
    setSending(false);

    if (error) {
      toast({ title: "Erro ao enviar", description: "Tente novamente mais tarde.", variant: "destructive" });
      return;
    }

    setSent(true);
    toast({ title: "Enviado com sucesso!", description: "Entraremos em contato em breve." });
  };

  if (sent) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-card border border-border rounded-2xl p-8 text-center"
      >
        <CheckCircle className="w-12 h-12 text-gold mx-auto mb-4" />
        <h3 className="font-display text-xl font-bold mb-2">Mensagem enviada!</h3>
        <p className="text-sm text-muted-foreground">
          Obrigado pelo interesse. Nossa equipe entrará em contato em breve.
        </p>
      </motion.div>
    );
  }

  return (
    <motion.form
      onSubmit={handleSubmit}
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      className="bg-card border border-border rounded-2xl p-6 md:p-8 space-y-5"
    >
      <h3 className="font-display text-xl font-bold text-center mb-2">Solicite uma demonstração</h3>
      <p className="text-sm text-muted-foreground text-center">
        Preencha o formulário e entraremos em contato.
      </p>

      <div className="grid md:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label htmlFor="lead-name">Nome *</Label>
          <Input id="lead-name" placeholder="Seu nome" value={form.name} onChange={(e) => update("name", e.target.value)} maxLength={100} required />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="lead-email">E-mail *</Label>
          <Input id="lead-email" type="email" placeholder="seu@email.com" value={form.email} onChange={(e) => update("email", e.target.value)} maxLength={255} required />
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label htmlFor="lead-phone">WhatsApp</Label>
          <Input id="lead-phone" placeholder="(11) 99999-9999" value={form.phone} onChange={(e) => update("phone", e.target.value)} maxLength={20} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="lead-winery">Nome da vinícola</Label>
          <Input id="lead-winery" placeholder="Vinícola Exemplo" value={form.winery_name} onChange={(e) => update("winery_name", e.target.value)} maxLength={100} />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="lead-message">Mensagem</Label>
        <Textarea id="lead-message" placeholder="Conte um pouco sobre sua vinícola e o que precisa..." value={form.message} onChange={(e) => update("message", e.target.value)} maxLength={1000} rows={3} />
      </div>

      <Button type="submit" disabled={sending} className="w-full bg-gold text-gold-foreground hover:bg-gold/90 h-11 text-sm font-semibold">
        {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
        {sending ? "Enviando..." : "Enviar mensagem"}
      </Button>
    </motion.form>
  );
}
