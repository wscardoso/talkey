import { NotificationsBoard } from "@/components/app/notifications-board";

export default function NotificacoesPage() {
  return (
    <div className="space-y-5">
      <header>
        <h1 className="font-[family-name:var(--font-display)] text-3xl tracking-[0.08em]">
          Notificações
        </h1>
        <p className="mt-1 text-sm text-[var(--steel)]">
          Escolha quais mensagens automáticas o cliente recebe no WhatsApp.
        </p>
      </header>
      <NotificationsBoard />
    </div>
  );
}
