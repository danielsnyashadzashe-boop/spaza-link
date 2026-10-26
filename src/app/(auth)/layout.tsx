import Image from "next/image";
import Link from "next/link";
import { BadgeCheck, LineChart, PackageCheck } from "lucide-react";
import { BrandStripe, Logo } from "@/components/logo";
import ownerPhoto from "../../../public/images/shop-owner-doorway.webp";

const POINTS = [
  { icon: PackageCheck, title: "Never run dry", body: "Live stock levels with alerts before the shelf is empty." },
  { icon: BadgeCheck, title: "Only verified suppliers", body: "Every product carries a SABS or Verified Supplier badge." },
  { icon: LineChart, title: "Proof of income", body: "Your orders become a Financial Health Report for the bank." },
];

export default function AuthLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="grid min-h-full flex-1 lg:grid-cols-[1fr_1.05fr]">
      <aside className="relative hidden overflow-hidden bg-brand text-white lg:flex lg:flex-col">
        <Image
          src={ownerPhoto}
          alt="A shop owner standing in the doorway of his shop, checking his phone"
          fill
          priority
          sizes="50vw"
          placeholder="blur"
          className="object-cover object-[50%_30%]"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-brand via-brand/80 to-brand/10" aria-hidden />
        <div className="relative flex flex-1 flex-col p-12">
          <Link href="/" className="w-fit">
            <Logo onDark className="px-4" />
          </Link>
          <div className="mt-auto max-w-md">
            <p className="mb-4 inline-block rounded-full bg-pink px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-white">
              Built for spaza shops
            </p>
            <h2 className="font-display text-4xl font-extrabold leading-[1.05] tracking-tight">
              From empty shelves to a bank ready report.
            </h2>
            <ul className="mt-10 space-y-6">
              {POINTS.map(({ icon: Icon, title, body }) => (
                <li key={title} className="flex gap-4">
                  <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-white/15 text-mustard backdrop-blur">
                    <Icon className="size-5" />
                  </span>
                  <span>
                    <span className="block font-semibold">{title}</span>
                    <span className="text-sm text-white/75">{body}</span>
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>
        <BrandStripe className="relative h-1.5 rounded-none" />
      </aside>
      <section className="flex flex-col px-5 py-8 sm:px-10 lg:px-16">
        <Link href="/" className="w-fit lg:hidden">
          <Logo />
        </Link>
        <div className="m-auto w-full max-w-[480px] py-12">{children}</div>
      </section>
    </div>
  );
}
