import { useProductivity } from "@/hooks/productivity/useProductivity";
interface Link {
  id: string;
  kind: string;
  title: string;
  url: string;
  state: string;
}
export function CardDevelopment({
  projectId,
  cardId,
}: {
  projectId: string;
  cardId: string;
}) {
  const { data: links = [] } = useProductivity<Link[]>(
    `projects/${projectId}/cards/${cardId}/development`,
  );
  return (
    <section className="pt-4 border-t border-slate-200 dark:border-white/[0.06] space-y-3">
      <h3 className="text-xs uppercase font-semibold text-slate-500">
        Development
      </h3>
      {links.map((l) => (
        <a
          key={l.id}
          className="block text-sm rounded-xl p-3 bg-emerald-500/5 hover:bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
          href={l.url}
          target="_blank"
          rel="noreferrer"
        >
          <span className="block font-semibold">{l.title}</span>
          <span className="text-xs">
            {l.kind.replaceAll("_", " ")} · {l.state}
          </span>
        </a>
      ))}
      {!links.length && (
        <p className="text-xs text-slate-500">
          Link pull requests, builds and deployments through signed
          GitHub/GitLab webhooks using CARD-{cardId} in the title, description
          or branch.
        </p>
      )}
    </section>
  );
}
