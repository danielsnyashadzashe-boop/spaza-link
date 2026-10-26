import type { ComponentProps } from "react";
import type { ClerkProvider } from "@clerk/nextjs";
import { shadcn } from "@clerk/ui/themes";

/** Clerk's prebuilt components on the shadcn theme, dressed in SpazaLink navy, pink and mustard. */
export const clerkAppearance: ComponentProps<typeof ClerkProvider>["appearance"] = {
  theme: shadcn,
  cssLayerName: "clerk",
  variables: {
    colorPrimary: "#062654",
    colorPrimaryForeground: "#ffffff",
    colorForeground: "#0B1B3A",
    colorMutedForeground: "#5B6478",
    colorBackground: "#ffffff",
    colorInput: "#ffffff",
    colorInputForeground: "#0B1B3A",
    colorBorder: "#F1DCE3",
    colorRing: "#F2366D",
    colorDanger: "#D63A2F",
    colorSuccess: "#1e8e5a",
    colorWarning: "#d99a00",
    colorNeutral: "#0B1B3A",
    fontFamily: "var(--font-geist-sans), system-ui, sans-serif",
    fontFamilyButtons: "var(--font-geist-sans), system-ui, sans-serif",
    borderRadius: "0.75rem",
  },
  elements: {
    // A real card with generous breathing room, matching the rest of the app.
    rootBox: "w-full",
    cardBox: "w-full max-w-none rounded-3xl border border-line bg-white shadow-card",
    card: "bg-white shadow-none border-0 gap-8 px-6 pt-10 pb-8 sm:px-10",
    header: "gap-2",
    headerTitle: "font-display text-3xl font-extrabold tracking-tight text-brand",
    headerSubtitle: "text-base text-muted-foreground",
    socialButtons: "gap-3",
    socialButtonsBlockButton: "h-12 rounded-xl border border-line bg-white px-4 shadow-none hover:bg-pink-50",
    dividerRow: "my-1",
    form: "gap-6",
    formFieldRow: "gap-4",
    formField: "gap-2",
    formFieldLabel: "text-sm font-medium text-ink",
    formFieldInput: "h-12 rounded-xl border border-line bg-white px-4 text-sm shadow-none focus:border-pink",
    formButtonPrimary: "mt-2 h-12 rounded-xl bg-brand text-sm font-semibold shadow-lift hover:bg-brand-600",
    footer: "bg-none bg-paper-2/40 border-t border-line",
    footerAction: "py-5",
    footerActionLink: "font-semibold text-pink-600 hover:text-brand",
    userButtonAvatarBox: "size-9 ring-2 ring-mustard/60",
  },
};
