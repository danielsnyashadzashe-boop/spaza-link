import Image, { type StaticImageData } from "next/image";
import type { ReactNode } from "react";
import { Info } from "lucide-react";

/** Admin page heading with a plain language "what is this" explainer, and an optional photo. */
export function PageHeader({
  eyebrow,
  title,
  explainer,
  action,
  image,
  imageAlt = "",
}: {
  eyebrow: string;
  title: string;
  explainer: ReactNode;
  action?: ReactNode;
  image?: StaticImageData;
  imageAlt?: string;
}) {
  return (
    <div className="mb-8 space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-pink-600">{eyebrow}</p>
          <h1 className="mt-1 font-display text-3xl font-extrabold tracking-tight text-brand sm:text-4xl">{title}</h1>
        </div>
        {action}
      </div>
      <div className="grid overflow-hidden rounded-2xl border border-brand/10 bg-brand-50/70 md:grid-cols-[1fr_auto]">
        <div className="flex gap-3 p-5 text-sm leading-relaxed text-ink">
          <Info className="mt-0.5 size-4 shrink-0 text-brand" />
          <div className="space-y-1.5">{explainer}</div>
        </div>
        {image && (
          <div className="relative hidden w-72 md:block">
            <Image src={image} alt={imageAlt} fill sizes="288px" placeholder="blur" className="object-cover" />
          </div>
        )}
      </div>
    </div>
  );
}
