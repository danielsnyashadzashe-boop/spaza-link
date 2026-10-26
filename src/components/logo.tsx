import Image from "next/image";
import { cn } from "@/lib/utils";

type LogoProps = {
  className?: string;
  /** lockup: mark + wordmark side by side (headers). mark: the shop and chain only. full: stacked master logo. */
  variant?: "lockup" | "mark" | "full";
  /** On navy backgrounds the navy parts of the logo vanish, so it sits on a white tile. */
  onDark?: boolean;
  priority?: boolean;
};

const ART = {
  lockup: { src: "/brand/logo-horizontal.png", width: 761, height: 200, className: "h-9 w-auto" },
  mark: { src: "/brand/mark.png", width: 512, height: 512, className: "size-9" },
  full: { src: "/brand/logo.png", width: 960, height: 757, className: "h-40 w-auto" },
} as const;

export function Logo({ className, variant = "lockup", onDark, priority }: LogoProps) {
  const art = ART[variant];
  const img = (
    <Image
      src={art.src}
      width={art.width}
      height={art.height}
      alt="SpazaLink"
      priority={priority}
      className={cn(art.className, !onDark && className)}
    />
  );
  if (!onDark) return img;
  return (
    <span className={cn("inline-flex items-center rounded-2xl bg-white px-3 py-2 shadow-lift", className)}>{img}</span>
  );
}

/** The logo's three colours as a band: a recurring brand detail on cards, sections and the footer. */
export function BrandStripe({ className }: { className?: string }) {
  return (
    <span className={cn("flex h-1.5 w-full overflow-hidden rounded-full", className)} aria-hidden>
      <span className="flex-1 bg-brand" />
      <span className="flex-1 bg-pink" />
      <span className="flex-1 bg-mustard" />
    </span>
  );
}
