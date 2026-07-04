import Link from 'next/link'
import { Sparkles, Clock, MapPin, Phone, Heart, ShieldCheck } from 'lucide-react'

export function Footer() {
  return (
    <footer className="w-full border-t border-black/5 dark:border-white/10 bg-[#F5F2EC] dark:bg-[#151518] text-foreground transition-colors">
      <div className="container mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-12 md:grid-cols-2 lg:grid-cols-4">
          {/* Brand & Mission */}
          <div className="space-y-4">
            <Link href="/" className="flex items-center gap-3 font-heading font-extrabold text-2xl tracking-tight">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-[#C93A2F] text-white shadow-md shadow-primary/20">
                <Sparkles className="h-5 w-5 fill-white" />
              </div>
              <span className="font-black tracking-tighter text-xl">PIZZA PLANET</span>
            </Link>
            <p className="text-sm text-muted-foreground font-body leading-relaxed">
              Artisanal Neapolitan & wood-fired pizzas crafted for the cosmos. We combine 48-hour slow-fermented sourdough with organic San Marzano tomatoes and boutique toppings.
            </p>
            <div className="flex items-center gap-4 text-xs font-semibold text-foreground/80 pt-2 font-mono">
              <span className="flex items-center gap-1.5 bg-white/60 dark:bg-black/40 px-3 py-1.5 rounded-full border border-black/5 dark:border-white/5">
                <ShieldCheck className="h-4 w-4 text-green-600" /> 100% Wood-Fired
              </span>
            </div>
          </div>

          {/* Quick Links */}
          <div className="space-y-4">
            <h3 className="font-heading font-bold text-base tracking-tight uppercase text-foreground/90">
              Explore Our Menu
            </h3>
            <ul className="space-y-2.5 text-sm font-body text-muted-foreground">
              <li>
                <Link href="/menu?category=cat-pizzas" className="hover:text-primary transition-colors">
                  Signature Artisan Pizzas
                </Link>
              </li>
              <li>
                <Link href="/menu?category=cat-sides" className="hover:text-primary transition-colors">
                  Cosmic Sides & Garlic Breads
                </Link>
              </li>
              <li>
                <Link href="/menu?category=cat-beverages" className="hover:text-primary transition-colors">
                  Craft Beverages & Sodas
                </Link>
              </li>
              <li>
                <Link href="/menu?category=cat-desserts" className="hover:text-primary transition-colors">
                  Stellar Desserts
                </Link>
              </li>
            </ul>
          </div>

          {/* Customer Care */}
          <div className="space-y-4">
            <h3 className="font-heading font-bold text-base tracking-tight uppercase text-foreground/90">
              My Account & Orders
            </h3>
            <ul className="space-y-2.5 text-sm font-body text-muted-foreground">
              <li>
                <Link href="/orders" className="hover:text-primary transition-colors">
                  Live Order Tracking (KDS)
                </Link>
              </li>
              <li>
                <Link href="/cart" className="hover:text-primary transition-colors">
                  Review Shopping Cart
                </Link>
              </li>
              <li>
                <Link href="/profile" className="hover:text-primary transition-colors">
                  Account Settings & Addresses
                </Link>
              </li>
              <li>
                <Link href="/auth/login" className="hover:text-primary transition-colors">
                  Sign In / Register
                </Link>
              </li>
            </ul>
          </div>

          {/* Restaurant Hours & Contact */}
          <div className="space-y-4">
            <h3 className="font-heading font-bold text-base tracking-tight uppercase text-foreground/90">
              Studio Hours & Location
            </h3>
            <div className="space-y-3 text-sm font-body text-muted-foreground">
              <div className="flex items-start gap-3">
                <Clock className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-foreground">Mon – Sun: 11:00 AM – 11:30 PM</p>
                  <p className="text-xs">Kitchen closes 30 mins before closing</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <MapPin className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                <p>Sector 42, Galactic Culinary District, Bengaluru, IN 560001</p>
              </div>
              <div className="flex items-center gap-3">
                <Phone className="h-5 w-5 text-primary shrink-0" />
                <p className="font-mono font-medium">+91 (800) PIZZA-PL</p>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="mt-16 pt-8 border-t border-black/5 dark:border-white/5 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-muted-foreground font-body">
          <p>© {new Date().getFullYear()} Pizza Planet Culinary Studio. All rights reserved.</p>
          <div className="flex items-center gap-6">
            <span className="flex items-center gap-1">
              Made with <Heart className="h-3.5 w-3.5 text-red-500 fill-red-500 inline" /> for artisanal pizza lovers
            </span>
          </div>
        </div>
      </div>
    </footer>
  )
}
