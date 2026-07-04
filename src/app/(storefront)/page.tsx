import Link from 'next/link'
import Image from 'next/image'
import { ArrowRight, Sparkles, Flame, ShieldCheck, Star, Clock, Award } from 'lucide-react'

export default function StorefrontPage() {
  const signaturePies = [
    {
      id: 'hot-honey',
      name: 'Hot Honey Pepperoni',
      price: '₹649',
      description: 'Artisanal calabrese pepperoni, hot chili honey drizzle, fresh basil leaves, organic San Marzano tomato sauce, fior di latte.',
      image: '/images/menu/hot_honey_pepperoni.png',
      badge: 'Bestseller',
      badgeColor: 'bg-primary text-white',
    },
    {
      id: 'truffle-fungi',
      name: 'Truffle Fungi Bianca',
      price: '₹699',
      description: 'Velvety white garlic cream base, roasted wild shiitake & cremini mushrooms, white truffle oil infusion, fresh thyme.',
      image: '/images/menu/truffle_fungi_bianca.png',
      badge: 'Chef’s Selection',
      badgeColor: 'bg-amber-600 text-white',
    },
    {
      id: 'margherita',
      name: 'Margherita Classico',
      price: '₹499',
      description: 'Pure Neapolitan heritage: D.O.P. San Marzano tomatoes, fresh buffalo mozzarella, aromatic basil, extra virgin olive oil.',
      image: '/images/menu/margherita_classico.png',
      badge: 'Traditional',
      badgeColor: 'bg-emerald-600 text-white',
    },
  ]

  return (
    <div className="flex flex-col min-h-screen bg-background text-foreground overflow-hidden">
      {/* 1. HERO SECTION */}
      <section className="relative pt-12 pb-24 md:pt-20 md:pb-32 lg:pt-28 lg:pb-40 px-4 sm:px-6 lg:px-8">
        {/* Soft Radial Particle Background */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] md:w-[900px] md:h-[900px] bg-gradient-to-tr from-primary/10 via-amber-500/5 to-transparent rounded-full blur-3xl pointer-events-none -z-10" />

        <div className="container mx-auto max-w-7xl">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center">
            {/* Left Column: Typography & CTAs */}
            <div className="lg:col-span-7 space-y-8 text-center lg:text-left">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white dark:bg-[#1C1C1F] border border-black/5 dark:border-white/10 shadow-sm text-xs font-bold tracking-wide uppercase text-primary">
                <Sparkles className="h-3.5 w-3.5 fill-primary" />
                <span>The Neapolitan Gold Standard</span>
              </div>

              <h1 className="font-heading font-extrabold text-5xl sm:text-6xl lg:text-7xl tracking-tight text-foreground leading-[1.08]">
                Artisanal Pies. <br className="hidden sm:inline" />
                <span className="bg-gradient-to-r from-primary via-[#D64A2B] to-[#C93A2F] bg-clip-text text-transparent">
                  Crafted for the Cosmos.
                </span>
              </h1>

              <p className="font-body text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto lg:mx-0 leading-relaxed font-normal">
                Experience authentic Neapolitan sourdough pizza. 48-hour slow-fermented crusts, organic D.O.P. San Marzano tomatoes, and 500°C wood-fired perfection delivered to your door.
              </p>

              <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4 pt-2">
                <Link
                  href="/menu"
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-3 rounded-full bg-gradient-to-r from-primary to-[#C93A2F] text-white font-heading font-bold px-8 py-4 text-base shadow-xl shadow-primary/25 hover:shadow-2xl hover:shadow-primary/35 hover:scale-[1.02] active:scale-[0.98] transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                >
                  <span>Explore Full Menu</span>
                  <ArrowRight className="h-5 w-5" />
                </Link>
                <Link
                  href="/menu?category=cat-pizzas"
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-full bg-white dark:bg-[#1C1C1F] border border-black/10 dark:border-white/10 text-foreground font-heading font-bold px-8 py-4 text-base shadow-md hover:border-primary/50 hover:bg-black/5 dark:hover:bg-white/5 transition-all duration-300"
                >
                  <span>Signature Pies</span>
                </Link>
              </div>

              {/* Social Proof Badges */}
              <div className="pt-6 border-t border-black/5 dark:border-white/10 flex flex-wrap items-center justify-center lg:justify-start gap-8 text-sm font-body text-muted-foreground">
                <div className="flex items-center gap-2">
                  <div className="flex text-amber-500">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} className="h-4 w-4 fill-amber-500 text-amber-500" />
                    ))}
                  </div>
                  <span className="font-bold text-foreground">4.9 / 5.0</span>
                  <span className="text-xs">(10k+ Pies Served)</span>
                </div>
                <div className="flex items-center gap-2 font-medium">
                  <Clock className="h-4 w-4 text-primary" />
                  <span>Avg. 24-Min Live Tracked Delivery</span>
                </div>
              </div>
            </div>

            {/* Right Column: Hero Visual & Floating Glass Cards */}
            <div className="lg:col-span-5 relative flex items-center justify-center">
              <div className="relative w-full max-w-[460px] aspect-square rounded-3xl overflow-hidden shadow-[0_30px_80px_rgba(0,0,0,0.15)] dark:shadow-[0_30px_80px_rgba(0,0,0,0.5)] border border-black/5 dark:border-white/10 group">
                <Image
                  src="/images/menu/hot_honey_pepperoni.png"
                  alt="Hot Honey Pepperoni Pizza in Wood Fired Oven"
                  fill
                  priority
                  className="object-cover transition-transform duration-700 group-hover:scale-105"
                  sizes="(max-width: 768px) 100vw, 460px"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-60" />

                {/* Floating Glass Badge Bottom */}
                <div className="absolute bottom-6 left-6 right-6 p-4 rounded-2xl bg-white/85 dark:bg-black/85 backdrop-blur-xl border border-white/20 shadow-lg flex items-center justify-between">
                  <div>
                    <h3 className="font-heading font-extrabold text-sm text-foreground">Hot Honey Pepperoni</h3>
                    <p className="text-xs text-muted-foreground">Charred sourdough & chili blossom honey</p>
                  </div>
                  <span className="font-heading font-black text-base text-primary bg-primary/10 px-3 py-1 rounded-full">
                    ₹649
                  </span>
                </div>
              </div>

              {/* Floating Decorative Pill */}
              <div className="absolute -top-6 -left-6 hidden sm:flex items-center gap-2.5 px-5 py-3 rounded-2xl bg-white dark:bg-[#1C1C1F] border border-black/5 dark:border-white/10 shadow-xl animate-bounce duration-[4000ms]">
                <Flame className="h-5 w-5 text-[#C93A2F] fill-[#C93A2F]" />
                <span className="text-xs font-bold font-heading">500°C Wood-Fired Oven</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 2. FEATURED BESTSELLERS SECTION */}
      <section className="py-20 md:py-28 bg-[#F0EDEF]/50 dark:bg-[#161619]/50 border-y border-black/5 dark:border-white/5 px-4 sm:px-6 lg:px-8">
        <div className="container mx-auto max-w-7xl space-y-12">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div className="space-y-3">
              <span className="text-xs font-bold uppercase tracking-widest text-primary font-mono">
                Stellar Signatures
              </span>
              <h2 className="font-heading font-extrabold text-3xl sm:text-4xl md:text-5xl tracking-tight">
                Our Masterpiece Pies
              </h2>
            </div>
            <Link
              href="/menu"
              className="inline-flex items-center gap-2 font-heading font-bold text-sm text-primary hover:text-primary/80 group transition-colors"
            >
              <span>View All 24+ Creations in Menu</span>
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {signaturePies.map((pie) => (
              <div
                key={pie.id}
                className="group relative flex flex-col h-full overflow-hidden rounded-[22px] bg-white dark:bg-[#1C1C1F] border border-black/5 dark:border-white/10 shadow-md hover:-translate-y-2 hover:shadow-2xl transition-all duration-300"
              >
                <div className="relative aspect-[4/3] w-full overflow-hidden bg-muted">
                  <Image
                    src={pie.image}
                    alt={pie.name}
                    fill
                    className="object-cover transition-transform duration-500 group-hover:scale-105"
                    sizes="(max-width: 768px) 100vw, 33vw"
                  />
                  <div className="absolute top-4 left-4">
                    <span className={`px-3 py-1 rounded-full text-xs font-bold shadow-md ${pie.badgeColor}`}>
                      {pie.badge}
                    </span>
                  </div>
                </div>

                <div className="flex flex-1 flex-col p-6 space-y-4">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-heading font-bold text-xl text-foreground group-hover:text-primary transition-colors">
                      {pie.name}
                    </h3>
                    <span className="font-heading font-black text-xl text-primary shrink-0">{pie.price}</span>
                  </div>
                  <p className="text-sm text-muted-foreground font-body leading-relaxed flex-1">
                    {pie.description}
                  </p>
                  <div className="pt-2">
                    <Link
                      href="/menu?category=cat-pizzas"
                      className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-black/5 dark:bg-white/5 hover:bg-primary hover:text-white text-foreground font-heading font-bold py-3.5 text-sm transition-all duration-300"
                    >
                      <span>Customize & Order</span>
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 3. ARTISANAL STORY / WHY WE STAND ALONE */}
      <section className="py-24 md:py-32 px-4 sm:px-6 lg:px-8">
        <div className="container mx-auto max-w-7xl space-y-16">
          <div className="text-center max-w-3xl mx-auto space-y-4">
            <span className="text-xs font-bold uppercase tracking-widest text-primary font-mono">
              The Boutique Craft
            </span>
            <h2 className="font-heading font-extrabold text-3xl sm:text-4xl md:text-5xl tracking-tight">
              Why Pizza Planet Stands Alone
            </h2>
            <p className="font-body text-base sm:text-lg text-muted-foreground leading-relaxed">
              We reject commercial shortcuts. Every pie is handcrafted to order by master pizzaiolos trained in Neapolitan traditions.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="p-8 rounded-[22px] bg-white dark:bg-[#1C1C1F] border border-black/5 dark:border-white/10 shadow-sm hover:shadow-lg transition-all space-y-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
                <Clock className="h-7 w-7" />
              </div>
              <h3 className="font-heading font-extrabold text-xl text-foreground">48-Hour Slow Fermentation</h3>
              <p className="text-sm text-muted-foreground font-body leading-relaxed">
                Our sourdough starter matures for two days in climate-controlled rooms. This breaks down gluten naturally, producing a light, digestible crust with signature leopard char spots.
              </p>
            </div>

            <div className="p-8 rounded-[22px] bg-white dark:bg-[#1C1C1F] border border-black/5 dark:border-white/10 shadow-sm hover:shadow-lg transition-all space-y-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                <Flame className="h-7 w-7" />
              </div>
              <h3 className="font-heading font-extrabold text-xl text-foreground">500°C Stone Wood-Fired</h3>
              <p className="text-sm text-muted-foreground font-body leading-relaxed">
                Baking at extreme heat in imported Italian dome ovens cooks each pizza in just 90 seconds, locking in moisture while searing the crust to crisp, smoky perfection.
              </p>
            </div>

            <div className="p-8 rounded-[22px] bg-white dark:bg-[#1C1C1F] border border-black/5 dark:border-white/10 shadow-sm hover:shadow-lg transition-all space-y-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                <Award className="h-7 w-7" />
              </div>
              <h3 className="font-heading font-extrabold text-xl text-foreground">D.O.P. San Marzano & Fior di Latte</h3>
              <p className="text-sm text-muted-foreground font-body leading-relaxed">
                We import volcanic soil San Marzano tomatoes directly from Campania, paired with creamy artisan mozzarella and organic cold-pressed extra virgin olive oil.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 4. FINAL CTA BANNER */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="container mx-auto max-w-5xl">
          <div className="relative rounded-[32px] overflow-hidden bg-gradient-to-r from-foreground to-[#203243] text-white p-10 sm:p-16 text-center space-y-8 shadow-2xl border border-white/10">
            <div className="absolute top-0 right-0 -mr-20 -mt-20 w-80 h-80 bg-primary/20 rounded-full blur-3xl pointer-events-none" />
            <div className="relative z-10 space-y-4 max-w-2xl mx-auto">
              <h2 className="font-heading font-black text-3xl sm:text-4xl md:text-5xl tracking-tight leading-tight">
                Ready to Experience Cosmic Culinary Perfection?
              </h2>
              <p className="font-body text-base sm:text-lg text-white/80">
                Order online for rapid live-tracked delivery or pick up freshly baked from our studio oven.
              </p>
            </div>
            <div className="relative z-10">
              <Link
                href="/menu"
                className="inline-flex items-center justify-center gap-3 rounded-full bg-gradient-to-r from-primary to-[#C93A2F] text-white font-heading font-extrabold px-10 py-5 text-lg shadow-xl shadow-primary/30 hover:scale-105 active:scale-95 transition-all duration-300"
              >
                <span>Start Your Order Now</span>
                <ArrowRight className="h-6 w-6" />
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
