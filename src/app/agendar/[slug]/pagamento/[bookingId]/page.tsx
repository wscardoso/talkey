import type { CSSProperties } from "react";
import { PixCheckout } from "@/components/booking/pix-checkout";
import { getTenantBySlug } from "@/lib/booking/tenant";
import { getThemePreset, themePresetVars } from "@/lib/themes/presets";

type Props = {
  params: Promise<{ slug: string; bookingId: string }>;
};

export default async function PagamentoPage({ params }: Props) {
  const { slug, bookingId } = await params;
  const tenant = await getTenantBySlug(slug).catch(() => null);
  const preset = getThemePreset(tenant?.themePreset);

  return (
    <div
      className="booking-shell min-h-dvh px-4 py-8"
      style={
        themePresetVars(preset, tenant?.brandPrimary ?? null) as CSSProperties
      }
    >
      <div className="mx-auto max-w-md">
        <PixCheckout slug={slug} bookingId={bookingId} />
      </div>
    </div>
  );
}
