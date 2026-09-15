import { WhatsAppBoard } from "@/components/app/whatsapp-board";

export default function WhatsAppPage() {
  return (
    <div className="space-y-5">
      <header>
        <h1 className="font-[family-name:var(--font-display)] text-3xl tracking-[0.08em]">
          WhatsApp
        </h1>
        <p className="mt-1 text-sm text-[var(--steel)]">
          Conecte o número do salão via QR Code (uazapi) para confirmações e
          lembretes.
        </p>
      </header>
      <WhatsAppBoard />
    </div>
  );
}
