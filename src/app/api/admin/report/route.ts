import { withAdmin } from "@/lib/api";
import { platformOverview, shopSummaries } from "@/lib/admin";
import { download } from "@/lib/download";
import { platformReportPdf } from "@/lib/platform-pdf";
import { PPTX_MIME, platformReportPptx } from "@/lib/pptx";

/** Platform report for admins: ?format=pdf (default) or ?format=pptx. */
export const GET = withAdmin(async (req, { db }) => {
  const [overview, shops] = await Promise.all([platformOverview(db), shopSummaries(db)]);
  const input = { origin: req.nextUrl.origin, overview, shops, generatedAt: new Date() };
  const stamp = input.generatedAt.toISOString().slice(0, 10);
  if (req.nextUrl.searchParams.get("format") === "pptx") {
    return download(await platformReportPptx(input), `SpazaLink_Platform_Report_${stamp}.pptx`, PPTX_MIME);
  }
  return download(await platformReportPdf(input), `SpazaLink_Platform_Report_${stamp}.pdf`, "application/pdf");
});
