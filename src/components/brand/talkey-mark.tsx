type Props = {
  className?: string;
  title?: string;
};

/** Balão de fala com chave: a confirmação que sai no WhatsApp + o horário cumprido. */
export function TalkeyMark({ className, title = "Talkey" }: Props) {
  return (
    <svg
      className={className}
      viewBox="0 0 40 40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label={title}
    >
      <title>{title}</title>
      <path
        d="M11 6h18a7 7 0 0 1 7 7v7a7 7 0 0 1-7 7H18l-6.5 7 3.5-7h-4a7 7 0 0 1-7-7v-7a7 7 0 0 1 7-7Z"
        stroke="currentColor"
        strokeWidth="2.6"
        strokeLinejoin="round"
      />
      <circle cx="14" cy="16.5" r="3.6" stroke="currentColor" strokeWidth="2.4" />
      <path
        d="M17.6 16.5H29"
        stroke="currentColor"
        strokeWidth="2.4"
        strokeLinecap="round"
      />
      <path
        d="M24.6 16.5v3.4M28.4 16.5v2.2"
        stroke="currentColor"
        strokeWidth="2.4"
        strokeLinecap="round"
      />
    </svg>
  );
}
