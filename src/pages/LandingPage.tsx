import { useNavigate } from "react-router-dom";
import { motion, type Easing } from "framer-motion";
import {
  Grape, ArrowRight, Smartphone, BarChart3, Users, QrCode,
  Wine, Star, ShoppingBag, ChefHat, TrendingUp, Shield, Zap,
  MessageCircle, Mail, MapPin
} from "lucide-react";
import enoflowLogo from "@/assets/enoflow-logo.png";
import phoneMockup from "@/assets/landing-phone-mockup.png";
import vineyardBg from "@/assets/landing-vineyard-bg.jpg";
import darkSectionBg from "@/assets/landing-dark-section.jpg";
import ContactForm from "@/components/landing/ContactForm";

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: (i: number) => ({
    opacity: 1, y: 0,
    transition: { delay: i * 0.1, duration: 0.6, ease: "easeOut" as Easing },
  }),
};

const stagger = {
  visible: { transition: { staggerChildren: 0.1 } },
};

const features = [
  {
    icon: Smartphone,
    title: "Experiência do Turista",
    desc: "App interativo com degustação guiada, cardápio digital, loja integrada e jornada gamificada.",
  },
  {
    icon: Users,
    title: "Captação de Leads",
    desc: "Capture dados de visitantes via WhatsApp com consentimento LGPD e construa sua base de clientes.",
  },
  {
    icon: BarChart3,
    title: "Inteligência de Dados",
    desc: "Dashboards com métricas de conversão, perfil demográfico, preferências sensoriais e ROI por ponto de captura.",
  },
  {
    icon: QrCode,
    title: "QR Codes Inteligentes",
    desc: "Múltiplos pontos de captura com QR codes rastreáveis para mesa, loja, degustação e restaurante.",
  },
  {
    icon: TrendingUp,
    title: "Automações D+1 e D+15",
    desc: "Mensagens automáticas pós-visita via WhatsApp para engajamento contínuo e aumento de vendas.",
  },
  {
    icon: Shield,
    title: "Multi-tenant & Escalável",
    desc: "Plataforma SaaS com gestão multi-vinícola, planos configuráveis e comissionamento por vendas.",
  },
];

const touristSteps = [
  {
    icon: QrCode,
    title: "Escaneia o QR Code",
    desc: "O turista lê o QR na mesa, balcão ou degustação e entra direto no app.",
  },
  {
    icon: Wine,
    title: "Degusta e Avalia",
    desc: "Avalia acidez, corpo e doçura de cada vinho enquanto descobre harmonizações.",
  },
  {
    icon: Star,
    title: "Recebe Recomendações",
    desc: "IA Sommelier sugere vinhos com base no perfil sensorial do visitante.",
  },
  {
    icon: ShoppingBag,
    title: "Compra e Compartilha",
    desc: "Monta o carrinho, gera voucher de compra e compartilha via WhatsApp.",
  },
];

const stats = [
  { value: "3x", label: "mais conversão em vendas" },
  { value: "85%", label: "de captura de leads" },
  { value: "40%", label: "de recompra pós-visita" },
  { value: "2min", label: "tempo médio de cadastro" },
];

export default function LandingPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background text-foreground overflow-x-hidden">
      {/* ── Navbar ── */}
      <nav className="fixed top-0 inset-x-0 z-50 glass">
        <div className="max-w-7xl mx-auto flex items-center justify-between px-6 py-3">
          <div className="flex items-center gap-2">
            <img src={enoflowLogo} alt="EnoFlow" className="h-8" />
          </div>
          <div className="hidden md:flex items-center gap-8 text-sm font-medium text-muted-foreground">
            <a href="#features" className="hover:text-foreground transition-colors">Funcionalidades</a>
            <a href="#tourist" className="hover:text-foreground transition-colors">Modo Turista</a>
            <a href="#data" className="hover:text-foreground transition-colors">Dados</a>
            <a href="#contact" className="hover:text-foreground transition-colors">Contato</a>
          </div>
          <button
            onClick={() => navigate("/admin/login")}
            className="bg-primary text-primary-foreground px-5 py-2 rounded-lg text-sm font-semibold hover:bg-primary/90 transition-colors"
          >
            Área do Cliente
          </button>
        </div>
      </nav>

      {/* ── Hero ── */}
      <section className="relative min-h-screen flex items-center pt-20">
        <img
          src={vineyardBg}
          alt="Vinhedos"
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-background via-background/85 to-background/40" />
        <div className="relative z-10 max-w-7xl mx-auto px-6 grid md:grid-cols-2 gap-12 items-center">
          <motion.div
            initial="hidden"
            animate="visible"
            variants={stagger}
          >
            <motion.div variants={fadeUp} custom={0} className="flex items-center gap-2 mb-4">
              <Grape className="w-5 h-5 text-gold" />
              <span className="text-xs font-semibold text-gold tracking-[0.2em] uppercase">EnoFlow</span>
            </motion.div>
            <motion.h1
              variants={fadeUp}
              custom={1}
              className="font-display text-4xl md:text-6xl font-bold leading-tight mb-6"
            >
              Transforme visitas em <span className="text-gradient-gold">dados valiosos</span>
            </motion.h1>
            <motion.p
              variants={fadeUp}
              custom={2}
              className="text-lg text-muted-foreground leading-relaxed mb-8 max-w-lg"
            >
              A plataforma de inteligência em enoturismo que conecta vinícolas aos seus visitantes, 
              captura leads qualificados e transforma cada degustação em oportunidade de vendas.
            </motion.p>
            <motion.div variants={fadeUp} custom={3} className="flex flex-wrap gap-4">
              <a
                href="#contact"
                className="bg-gold text-gold-foreground px-8 py-3 rounded-lg font-semibold text-sm hover:opacity-90 transition-opacity flex items-center gap-2"
              >
                Agendar demonstração
                <ArrowRight className="w-4 h-4" />
              </a>
              <a
                href="#tourist"
                className="border border-border bg-background/60 backdrop-blur-sm px-8 py-3 rounded-lg font-semibold text-sm hover:bg-secondary transition-colors"
              >
                Ver modo turista
              </a>
            </motion.div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 40, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.8, delay: 0.3 }}
            className="hidden md:flex justify-center"
          >
            <img
              src={phoneMockup}
              alt="App EnoFlow no celular"
              className="w-72 lg:w-80 drop-shadow-2xl"
            />
          </motion.div>
        </div>
      </section>

      {/* ── Stats bar ── */}
      <section className="bg-primary text-primary-foreground py-12">
        <div className="max-w-7xl mx-auto px-6 grid grid-cols-2 md:grid-cols-4 gap-8">
          {stats.map((s, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="text-center"
            >
              <p className="font-display text-3xl md:text-4xl font-bold text-gold">{s.value}</p>
              <p className="text-sm mt-1 opacity-80">{s.label}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ── Features ── */}
      <section id="features" className="py-24 bg-background">
        <div className="max-w-7xl mx-auto px-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <span className="text-xs font-semibold text-gold tracking-[0.2em] uppercase">Funcionalidades</span>
            <h2 className="font-display text-3xl md:text-4xl font-bold mt-3">
              Tudo que sua vinícola precisa
            </h2>
            <p className="text-muted-foreground mt-4 max-w-2xl mx-auto">
              Do primeiro QR Code escaneado até a análise de ROI, o EnoFlow cobre toda a jornada do enoturismo digital.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((f, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.08 }}
                className="bg-card border border-border rounded-2xl p-6 hover:shadow-lg hover:border-gold/30 transition-all group"
              >
                <div className="w-12 h-12 rounded-xl bg-gold/10 flex items-center justify-center mb-4 group-hover:bg-gold/20 transition-colors">
                  <f.icon className="w-6 h-6 text-gold" />
                </div>
                <h3 className="font-display text-lg font-semibold mb-2">{f.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{f.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Modo Turista ── */}
      <section
        id="tourist"
        className="relative py-24 overflow-hidden"
      >
        <img
          src={darkSectionBg}
          alt=""
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-black/60" />
        <div className="relative z-10 max-w-7xl mx-auto px-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <span className="text-xs font-semibold text-gold tracking-[0.2em] uppercase">Modo Turista</span>
            <h2 className="font-display text-3xl md:text-4xl font-bold mt-3 text-white">
              A jornada do visitante
            </h2>
            <p className="text-white/70 mt-4 max-w-2xl mx-auto">
              Uma experiência interativa e memorável que transforma visitantes em clientes fiéis — sem baixar nenhum app.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {touristSteps.map((s, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.12 }}
                className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-6 text-center"
              >
                <div className="w-14 h-14 rounded-full bg-gold/20 flex items-center justify-center mx-auto mb-4">
                  <s.icon className="w-7 h-7 text-gold" />
                </div>
                <span className="text-xs font-bold text-gold">Passo {i + 1}</span>
                <h3 className="font-display text-lg font-semibold text-white mt-1 mb-2">{s.title}</h3>
                <p className="text-sm text-white/60 leading-relaxed">{s.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Data / Dados ── */}
      <section id="data" className="py-24 bg-background">
        <div className="max-w-7xl mx-auto px-6 grid md:grid-cols-2 gap-16 items-center">
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
          >
            <span className="text-xs font-semibold text-gold tracking-[0.2em] uppercase">Dados & Inteligência</span>
            <h2 className="font-display text-3xl md:text-4xl font-bold mt-3 mb-6">
              Do enoturismo para a<br />
              <span className="text-gradient-gold">transformação digital</span>
            </h2>
            <div className="space-y-5">
              {[
                { icon: Users, text: "Base de leads qualificados com perfil demográfico, preferências sensoriais e histórico de compras." },
                { icon: BarChart3, text: "Dashboards em tempo real com métricas de conversão, ticket médio e ROI por ponto de captura." },
                { icon: Zap, text: "Automações inteligentes de pós-venda com campanhas segmentadas por perfil de visitante." },
                { icon: ChefHat, text: "Cardápio digital com harmonizações inteligentes que aumentam o ticket médio do restaurante." },
              ].map((item, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1 }}
                  className="flex gap-4"
                >
                  <div className="w-10 h-10 rounded-lg bg-gold/10 flex items-center justify-center shrink-0">
                    <item.icon className="w-5 h-5 text-gold" />
                  </div>
                  <p className="text-sm text-muted-foreground leading-relaxed">{item.text}</p>
                </motion.div>
              ))}
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="flex justify-center"
          >
            <div className="relative">
              <div className="w-72 h-[500px] bg-card border-2 border-border rounded-[2.5rem] p-3 shadow-2xl">
                <div className="w-full h-full bg-primary rounded-[2rem] flex flex-col items-center justify-center p-6 text-center overflow-hidden">
                  <Grape className="w-10 h-10 text-gold mb-4" />
                  <p className="font-display text-xl font-bold text-primary-foreground mb-2">EnoFlow</p>
                  <p className="text-xs text-primary-foreground/60 mb-6">Experiência do Turista</p>
                  <div className="space-y-3 w-full">
                    {["🍷 Degustação", "🍽️ Restaurante", "🛒 Loja", "📊 Minha Jornada"].map((label, i) => (
                      <div
                        key={i}
                        className="bg-white/10 backdrop-blur rounded-xl py-3 px-4 text-xs font-medium text-primary-foreground/90 text-left"
                      >
                        {label}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              {/* Decorative glow */}
              <div className="absolute -inset-8 bg-gold/5 rounded-full blur-3xl -z-10" />
            </div>
          </motion.div>
        </div>
      </section>

      {/* ── CTA + Contact Form ── */}
      <section id="contact" className="py-24 bg-primary">
        <div className="max-w-6xl mx-auto px-6">
          <div className="grid md:grid-cols-2 gap-12 items-start">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
            >
              <Grape className="w-10 h-10 text-gold mb-4" />
              <h2 className="font-display text-3xl md:text-4xl font-bold text-primary-foreground mb-4">
                Pronto para digitalizar seu enoturismo?
              </h2>
              <p className="text-primary-foreground/70 mb-8 max-w-lg">
                Agende uma demonstração gratuita e descubra como o EnoFlow pode transformar a experiência dos seus visitantes em dados e vendas.
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <a
                  href="https://wa.me/5511983580664?text=Ol%C3%A1!%20Gostaria%20de%20saber%20mais%20sobre%20o%20EnoFlow"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="bg-gold text-gold-foreground px-8 py-3.5 rounded-lg font-semibold text-sm hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
                >
                  <MessageCircle className="w-4 h-4" />
                  Falar pelo WhatsApp
                </a>
                <button
                  onClick={() => navigate("/admin/login")}
                  className="border border-primary-foreground/30 text-primary-foreground px-8 py-3.5 rounded-lg font-semibold text-sm hover:bg-primary-foreground/10 transition-colors flex items-center justify-center gap-2"
                >
                  Já sou cliente
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </motion.div>

            <ContactForm />
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="bg-card border-t border-border py-12">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid md:grid-cols-3 gap-8 mb-8">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <img src={enoflowLogo} alt="EnoFlow" className="h-7" />
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Inteligência em enoturismo. A plataforma que conecta vinícolas aos seus visitantes com experiências digitais memoráveis.
              </p>
            </div>
            <div>
              <h4 className="font-display font-semibold mb-3">Plataforma</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><a href="#features" className="hover:text-foreground transition-colors">Funcionalidades</a></li>
                <li><a href="#tourist" className="hover:text-foreground transition-colors">Modo Turista</a></li>
                <li><a href="#data" className="hover:text-foreground transition-colors">Dados & Inteligência</a></li>
                <li><button onClick={() => navigate("/admin/login")} className="hover:text-foreground transition-colors">Área do Cliente</button></li>
              </ul>
            </div>
            <div>
              <h4 className="font-display font-semibold mb-3">Contato</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-center gap-2"><Mail className="w-4 h-4" /> lucas.lima@idealbi.com.br</li>
                <li className="flex items-center gap-2"><MessageCircle className="w-4 h-4" /> (11) 98358-0664</li>
                <li className="flex items-center gap-2"><MapPin className="w-4 h-4" /> Rua Mazel, 234 - Cotia, SP</li>
              </ul>
            </div>
          </div>
          <div className="border-t border-border pt-6 flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-xs text-muted-foreground">© {new Date().getFullYear()} EnoFlow. Todos os direitos reservados.</p>
            <button
              onClick={() => navigate("/privacidade")}
              className="text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              Política de Privacidade
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
}
