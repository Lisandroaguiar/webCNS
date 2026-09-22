export function FeedbackLink({ className = "" }: { className?: string }) {
  const href = process.env.NEXT_PUBLIC_FEEDBACK_URL || "https://github.com/Lisandroaguiar/webCNS/issues/new";
  return <a href={href} target="_blank" rel="noreferrer" className={`text-xs font-bold underline decoration-cronopios-magenta underline-offset-4 ${className}`}>¿Encontraste un problema?</a>;
}
