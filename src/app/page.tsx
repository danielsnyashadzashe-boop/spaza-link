import Image from "next/image";
import Link from "next/link";
import { Suspense } from "react";
import { Show, SignInButton, SignUpButton, UserButton } from "@clerk/nextjs";
import {
  AlertTriangle,
  ArrowRight,
  BadgeCheck,
  FileCheck2,
  HandHeart,
  Landmark,
  Lock,
  PackageCheck,
  Quote,
  ShieldCheck,
  Truck,
} from "lucide-react";
import { BrandStripe, Logo } from "@/components/logo";
import { Reveal } from "@/components/motion";
import { SiteFooter } from "@/components/site-footer";
import freshStock from "../../public/images/fresh-stock-check.webp";
import supplierDelivery from "../../public/images/supplier-delivery.webp";
import shoppers from "../../public/images/shoppers-reading-labels.webp";
import handover from "../../public/images/delivery-handover.webp";
import streetStall from "../../public/images/street-stall.webp";
import ownerProduce from "../../public/images/owner-checking-produce.webp";
import happyCustomer from "../../public/images/happy-customer-bags.webp";

const STREET = [
  {
    image: supplierDelivery,
    alt: "A supplier carrying boxes of fresh produce into a shop",
    tag: "Wholesalers",
    title: "Verified suppliers, straight to your door",
    body: "Every wholesaler is checked before a single product reaches your shelf, and every delivery is tracked step by step.",
  },
  {
    image: shoppers,
    alt: "Two shoppers reading the label on a jar in a grocery aisle",
    tag: "Customers",
    title: "Food your customers can trust",
    body: "SABS, NRCS and Halaal badges travel with each product, so what your neighbours buy is genuine and safe.",
  },
  {
    image: handover,
    alt: "A shop owner receiving a packed order across the counter",
    tag: "Shop owners",
    title: "Restock without leaving the counter",
    body: "Tap Quick Fix, choose PayShap, EFT or cash, and follow the order until it is in your hands.",
  },
];

const PROBLEMS = [
  {
    icon: PackageCheck,
    problem: "Unreliable supply leaves shelves empty",
    solution: "Live stock tracking with low stock alerts and restock in a single tap.",
  },
  {
    icon: ShieldCheck,
    problem: "Counterfeit and unsafe food reaches the community",
    solution: "Ordering only from verified, SABS approved wholesalers.",
  },
  {
    icon: Landmark,
    problem: "No formal proof of income for a loan",
    solution: "Every order becomes a Financial Health Report for the bank.",
  },
];

const STEPS = [
  { n: "01", title: "Get compliant", body: "Upload your CIPC and BEE documents and watch your score climb to 85% Ready." },
  { n: "02", title: "Track your shelves", body: "Green, yellow, red. Know what is running low before a customer asks." },
  { n: "03", title: "Restock in one tap", body: "Quick Fix fills your cart with the missing stock from a verified supplier." },
  { n: "04", title: "Unlock credit", body: "Download a Financial Health Report built from your real trading history." },
];

const VALUES = [
  { icon: PackageCheck, title: "Shelves first", body: "A full shelf is a full till. Everything we build starts there." },
  { icon: ShieldCheck, title: "Safety you can see", body: "Every product carries the badge that proves where it came from." },
  { icon: HandHeart, title: "Trust you can carry", body: "Your trading history, turned into a report a bank can believe." },
];

export default function Home() {
  return (
    <div className="flex flex-1 flex-col overflow-x-clip">
      <header className="mx-auto flex w-full max-w-7xl items-center justify-between gap-3 px-4 py-5 sm:px-6">
        <Link href="/" aria-label="SpazaLink home">
          <Logo priority className="h-8 sm:h-11" />
        </Link>
        <nav className="flex items-center gap-1 sm:gap-2">
          <a href="#how" className="hidden whitespace-nowrap rounded-xl px-3 py-2.5 text-sm font-semibold text-muted-foreground transition hover:bg-paper-2 hover:text-ink lg:block">
            How it works
          </a>
          <a href="#about" className="hidden whitespace-nowrap rounded-xl px-3 py-2.5 text-sm font-semibold text-muted-foreground transition hover:bg-paper-2 hover:text-ink lg:block">
            About
          </a>
          <Suspense>
            <Show when="signed-out">
              <SignInButton>
                <button className="whitespace-nowrap rounded-xl px-3 py-2.5 text-sm font-semibold text-ink hover:bg-paper-2 sm:px-4">Sign in</button>
              </SignInButton>
              <SignUpButton>
                <button className="whitespace-nowrap rounded-xl bg-brand px-3 py-2.5 text-sm font-semibold text-white shadow-lift hover:bg-brand-600 sm:px-4">
                  Register shop
                </button>
              </SignUpButton>
            </Show>
            <Show when="signed-in">
              <Link
                href="/start"
                className="whitespace-nowrap rounded-xl bg-brand px-3 py-2.5 text-sm font-semibold text-white shadow-lift hover:bg-brand-600 sm:px-4"
              >
                Open dashboard
              </Link>
              <UserButton />
            </Show>
          </Suspense>
        </nav>
      </header>

      <section className="relative mx-auto grid w-full max-w-7xl items-center gap-12 px-4 pb-24 pt-8 sm:px-6 lg:grid-cols-[1.1fr_1fr] lg:pt-14">
        <div className="pointer-events-none absolute -left-32 top-10 -z-10 size-96 rounded-full bg-pink/15 blur-3xl" aria-hidden />
        <div className="pointer-events-none absolute right-0 top-40 -z-10 size-80 rounded-full bg-mustard/20 blur-3xl" aria-hidden />
        <div className="animate-fade-up">
          <p className="inline-flex items-center gap-2 rounded-full border border-pink/20 bg-pink-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-pink-600">
            <BadgeCheck className="size-3.5" /> Made for South African spaza shops
          </p>
          <h1 className="mt-5 font-display text-5xl font-extrabold leading-[0.98] tracking-tight text-brand sm:text-6xl lg:text-7xl">
            Full shelves.
            <br />
            Safe stock.
            <br />
            <span className="relative inline-block text-pink">
              Bank ready.
              <svg viewBox="0 0 300 16" className="absolute -bottom-2 left-0 w-full" aria-hidden>
                <path d="M3 11c60-8 180-10 294-4" stroke="#F4AF23" strokeWidth="6" fill="none" strokeLinecap="round" />
              </svg>
            </span>
          </h1>
          <p className="mt-7 max-w-xl text-lg text-muted-foreground">
            SpazaLink connects township traders to verified wholesalers, keeps track of every shelf, and turns your
            everyday trading into proof of income you can take to the bank.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href="/sign-up"
              className="btn-shine inline-flex h-14 items-center gap-2 rounded-xl bg-brand px-6 text-base font-semibold text-white shadow-lift transition hover:-translate-y-0.5 hover:bg-brand-600"
            >
              Register your shop <ArrowRight className="size-4" />
            </Link>
            <Link
              href="/sign-in"
              className="inline-flex h-14 items-center gap-2 rounded-xl border border-pink/30 bg-card px-6 text-base font-semibold text-pink-600 transition hover:bg-pink-50"
            >
              Try the demo shop
            </Link>
          </div>
          <p className="mt-5 flex items-center gap-2 text-sm text-muted-foreground">
            <Lock className="size-4" /> Your data is walled off. Other shops never see your orders or documents.
          </p>
        </div>

        <HeroPreview />
      </section>

      <section className="bg-brand text-white">
        <div className="mx-auto grid max-w-7xl lg:grid-cols-[0.8fr_1.2fr]">
          <div className="relative min-h-72 lg:min-h-full">
            <Image
              src={streetStall}
              alt="An informal street stall with clothes and goods laid out for sale"
              fill
              sizes="(min-width: 1024px) 40vw, 100vw"
              placeholder="blur"
              className="object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-brand via-brand/40 to-transparent lg:bg-gradient-to-r lg:from-transparent lg:via-brand/30 lg:to-brand" aria-hidden />
            <p className="absolute bottom-6 left-6 right-6 font-display text-2xl font-bold leading-snug lg:hidden">
              Informal trade is real trade. It just needs the paper to prove it.
            </p>
          </div>
          <div className="px-6 py-14 sm:px-10 lg:py-16">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-mustard">The problem we solve</p>
            <h2 className="mt-2 hidden font-display text-3xl font-extrabold leading-tight lg:block">
              Informal trade is real trade. It just needs the paper to prove it.
            </h2>
            <ul className="mt-8 space-y-7">
              {PROBLEMS.map(({ icon: Icon, problem, solution }, i) => (
                <li key={problem} className="flex gap-5">
                  <span
                    className={`flex size-12 shrink-0 items-center justify-center rounded-xl ${i === 1 ? "bg-pink text-white" : "bg-mustard text-ink"}`}
                  >
                    <Icon className="size-6" />
                  </span>
                  <span>
                    <span className="block text-sm font-semibold text-white/55 line-through decoration-pink/70">{problem}</span>
                    <span className="mt-1 block font-display text-xl font-bold leading-snug">{solution}</span>
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <section className="mx-auto w-full max-w-7xl px-4 pt-24 sm:px-6">
        <div className="max-w-2xl">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-pink-600">Built for the whole street</p>
          <h2 className="mt-2 font-display text-4xl font-extrabold tracking-tight text-brand">
            One link between the wholesaler, the shop and the customer.
          </h2>
        </div>
        <div className="mt-12 grid gap-8 md:grid-cols-3">
          {STREET.map((c, i) => (
            <Reveal key={c.title} delay={i * 120} as="article" className="group overflow-hidden rounded-3xl border border-line bg-card shadow-card transition hover:-translate-y-1 hover:shadow-lift">
              <div className="relative aspect-[4/3] overflow-hidden">
                <Image
                  src={c.image}
                  alt={c.alt}
                  fill
                  sizes="(min-width: 768px) 33vw, 100vw"
                  placeholder="blur"
                  className="object-cover transition duration-500 group-hover:scale-105"
                />
                <span className="absolute left-4 top-4 rounded-full bg-white/90 px-3 py-1 text-xs font-semibold text-brand backdrop-blur">
                  {c.tag}
                </span>
              </div>
              <div className="p-7">
                <h3 className="font-display text-xl font-bold leading-snug text-brand">{c.title}</h3>
                <p className="mt-2 text-muted-foreground">{c.body}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      <section id="how" className="mx-auto w-full max-w-7xl scroll-mt-8 px-4 py-24 sm:px-6">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-pink-600">How it works</p>
        <h2 className="mt-2 max-w-2xl font-display text-4xl font-extrabold tracking-tight text-brand">
          From empty shelves to a bank ready report in one week.
        </h2>
        <div className="mt-12 grid items-stretch gap-8 lg:grid-cols-[0.8fr_1.2fr]">
          <div className="relative min-h-80 overflow-hidden rounded-3xl shadow-lift">
            <Image
              src={ownerProduce}
              alt="A shop owner checking fresh produce in her store"
              fill
              sizes="(min-width: 1024px) 35vw, 100vw"
              placeholder="blur"
              className="object-cover object-[50%_35%]"
            />
            <span className="absolute bottom-5 left-5 rounded-full bg-white/90 px-3 py-1.5 text-xs font-semibold text-brand backdrop-blur">
              Know your shelves before your customers do
            </span>
          </div>
        <div className="grid gap-6 sm:grid-cols-2">
          {STEPS.map((s, i) => (
            <Reveal key={s.n} delay={i * 110} className="group relative overflow-hidden rounded-2xl border border-line bg-card p-7 shadow-card transition hover:-translate-y-1 hover:shadow-lift">
              <BrandStripe className="absolute inset-x-0 top-0 h-1 rounded-none opacity-0 transition group-hover:opacity-100" />
              <p className="num font-display text-4xl font-extrabold text-mustard">{s.n}</p>
              <h3 className="mt-3 font-display text-lg font-bold">{s.title}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{s.body}</p>
            </Reveal>
          ))}
        </div>
        </div>
      </section>

      <About />

      <section className="mx-auto w-full max-w-7xl px-4 py-24 sm:px-6">
        <div className="grid overflow-hidden rounded-[2rem] bg-brand text-white shadow-lift lg:grid-cols-[1.1fr_1fr]">
          <div className="flex flex-col justify-center gap-6 p-8 sm:p-12">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-mustard">Open your shop on SpazaLink</p>
            <h2 className="font-display text-4xl font-extrabold leading-tight tracking-tight">
              Happy customers, full shelves and a report the bank believes.
            </h2>
            <p className="text-lg text-white/75">
              Registering takes two minutes: create your login, tell us about your shop, and start tracking stock today.
            </p>
            <div className="flex flex-wrap gap-3">
              <Link
                href="/sign-up"
                className="btn-shine inline-flex h-14 items-center gap-2 rounded-xl bg-mustard px-6 text-base font-semibold text-ink transition hover:-translate-y-0.5 hover:brightness-105"
              >
                Register your shop <ArrowRight className="size-4" />
              </Link>
              <Link
                href="/sign-in"
                className="inline-flex h-14 items-center gap-2 rounded-xl border border-white/25 px-6 text-base font-semibold text-white transition hover:bg-white/10"
              >
                Sign in
              </Link>
            </div>
          </div>
          <div className="relative min-h-72">
            <Image
              src={happyCustomer}
              alt="A smiling customer carrying shopping bags out of a shop"
              fill
              sizes="(min-width: 1024px) 45vw, 100vw"
              placeholder="blur"
              className="object-cover object-[60%_40%]"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-brand/60 to-transparent lg:from-brand" aria-hidden />
          </div>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}

function About() {
  return (
    <section id="about" className="scroll-mt-8 border-t border-line bg-gradient-to-b from-pink-50/70 to-paper">
      <div className="mx-auto grid w-full max-w-7xl items-center gap-14 px-4 py-24 sm:px-6 lg:grid-cols-[0.9fr_1.1fr]">
        <div className="relative mx-auto w-full max-w-md">
          <div className="absolute -inset-4 -rotate-3 rounded-[2rem] bg-mustard/25" aria-hidden />
          <div className="absolute -inset-4 rotate-2 rounded-[2rem] bg-pink/15" aria-hidden />
          <div className="relative rounded-[2rem] bg-white p-10 shadow-lift">
            <Logo variant="full" className="mx-auto h-auto w-full" />
            <BrandStripe className="mt-8" />
            <p className="mt-4 text-center text-sm font-medium text-muted-foreground">
              A shop, a link, and a stronger street.
            </p>
          </div>
        </div>

        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-pink-600">About SpazaLink</p>
          <h2 className="mt-2 font-display text-4xl font-extrabold tracking-tight text-brand">
            The shop that feeds the street deserves to be trusted by the bank.
          </h2>
          <div className="mt-6 space-y-4 text-lg text-muted-foreground">
            <p>
              SpazaLink is the idea of <span className="font-semibold text-ink">Rethabile Madonsela</span>, who saw spaza
              owners keep whole neighbourhoods fed with handwritten stock books, early taxi runs to the wholesaler and a
              memory sharper than any spreadsheet. The trading was real. The paperwork was not.
            </p>
            <p>
              So she set out to link the two. Every loaf ordered, every rand paid on time and every certificate uploaded
              now quietly adds up to proof that a business is strong, safe and ready to grow.
            </p>
          </div>

          <Reveal as="figure" className="mt-8 rounded-2xl border border-line bg-white p-6 shadow-card">
            <Quote className="size-7 text-pink" aria-hidden />
            <blockquote className="mt-3 font-display text-xl font-bold leading-snug text-brand">
              Our spaza shops are not small businesses waiting to grow up. They are the backbone of the street. SpazaLink
              simply hands them the paper to prove it.
            </blockquote>
            <figcaption className="mt-5 flex items-center gap-3">
              <span className="flex size-11 items-center justify-center rounded-full bg-pink font-display text-sm font-extrabold text-white">
                RM
              </span>
              <span>
                <span className="block font-semibold text-ink">Rethabile Madonsela</span>
                <span className="block text-sm text-muted-foreground">Founder and idea owner, SpazaLink</span>
              </span>
            </figcaption>
          </Reveal>

          <ul className="mt-8 grid gap-4 sm:grid-cols-3">
            {VALUES.map(({ icon: Icon, title, body }, i) => (
              <Reveal key={title} as="li" delay={i * 120}>
                <span className="flex size-10 items-center justify-center rounded-xl bg-brand text-mustard">
                  <Icon className="size-5" />
                </span>
                <p className="mt-3 font-semibold text-ink">{title}</p>
                <p className="text-sm text-muted-foreground">{body}</p>
              </Reveal>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}

function HeroPreview() {
  return (
    <div className="relative animate-fade-up px-2 pb-10 pt-6 [animation-delay:120ms] sm:px-6">
      <div className="absolute -inset-2 -z-10 rotate-2 rounded-[2.5rem] bg-mustard/25" aria-hidden />
      <div className="relative aspect-[4/3] overflow-hidden rounded-[2rem] shadow-lift">
        <Image
          src={freshStock}
          alt="A shopper checking fresh eggs in a well stocked shop"
          fill
          priority
          sizes="(min-width: 1024px) 45vw, 100vw"
          placeholder="blur"
          className="object-cover object-[60%_40%]"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-brand/50 via-transparent to-transparent" aria-hidden />
      </div>

      <div className="absolute -left-2 top-0 hidden w-72 animate-float items-center gap-3 rounded-2xl border border-bad/20 bg-white p-3.5 shadow-lift sm:flex" aria-hidden>
        <AlertTriangle className="size-5 shrink-0 text-bad" />
        <p className="flex-1 text-sm font-semibold">White Sugar is running out</p>
        <span className="rounded-lg bg-mustard px-2.5 py-1.5 text-xs font-bold">Quick Fix</span>
      </div>

      <div className="absolute -right-2 bottom-16 hidden w-60 animate-float-slow rounded-2xl bg-brand p-4 text-white shadow-lift [animation-delay:1.2s] sm:block" aria-hidden>
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-mustard">Compliance score</p>
        <p className="font-display text-3xl font-extrabold">85% Ready</p>
        <div className="mt-2 h-2 rounded-full bg-white/15">
          <div className="h-full w-[85%] origin-left animate-grow-x rounded-full bg-gradient-to-r from-pink to-mustard [animation-delay:400ms]" />
        </div>
      </div>

      <div className="absolute -bottom-1 left-6 hidden animate-float items-center gap-3 rounded-2xl border border-line bg-white p-4 shadow-lift [animation-delay:2.4s] sm:flex" aria-hidden>
        <span className="flex size-10 items-center justify-center rounded-xl bg-pink text-white">
          <FileCheck2 className="size-5" />
        </span>
        <div>
          <p className="text-sm font-bold">Financial Health Report</p>
          <p className="text-xs text-muted-foreground">Credit health: Good · 100% on time</p>
        </div>
      </div>

      <div className="absolute right-4 top-2 hidden rotate-3 items-center gap-2 rounded-xl bg-brand px-3 py-2 text-xs font-semibold text-white shadow-lift md:flex" aria-hidden>
        <Truck className="size-4 text-mustard" /> Out for Delivery
      </div>
    </div>
  );
}
