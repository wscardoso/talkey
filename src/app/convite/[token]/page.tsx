import { AcceptInviteForm } from "@/components/app/accept-invite-form";

export default async function ConvitePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-4 py-10">
      <h1 className="font-[family-name:var(--font-display)] text-3xl tracking-[0.08em]">
        Aceitar convite
      </h1>
      <p className="mt-2 text-sm text-[var(--steel)]">
        Defina sua senha para acessar o painel Talkey.
      </p>
      <div className="mt-8">
        <AcceptInviteForm token={token} />
      </div>
    </main>
  );
}
