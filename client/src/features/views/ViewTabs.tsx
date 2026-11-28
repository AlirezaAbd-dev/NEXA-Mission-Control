import { useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router";
import { MoreHorizontal, Zap, Settings, FolderOpen } from "lucide-react";
import { tr, useUiLocale } from "@/i18n";
import { CustomSelect, Dropdown } from "@/components/ui";
import { useProject } from "@/hooks/project/useProject";
import { useAuthStore } from "@/stores/auth.store";
import { isWorkView, projectSection, readWorkView, saveWorkView } from "@/lib/projectNavigation";

export function ViewTabs({ projectId }: { projectId: string }) {
  useUiLocale();
  const { pathname, search } = useLocation();
  const navigate = useNavigate();
  const { data: project } = useProject(projectId);
  const userId = useAuthStore(state => state.user?.id);
  const section = projectSection(pathname, projectId);
  const inWork = isWorkView(section);
  useEffect(() => { saveWorkView(userId, projectId, section); }, [userId, projectId, section]);
  const resource = section === "governance" && new URLSearchParams(search).get("section") === "resources";
  const current = inWork ? "work" : resource ? "resources" : section;
  const sections = [
    { value: "work", label: tr("Work"), path: inWork ? section : readWorkView(userId, projectId) },
    { value: "backlog", label: tr("Backlog"), path: "backlog" },
    { value: "insights", label: tr("Reports"), path: "insights" },
    { value: "service-desk", label: tr("Service desk"), path: "service-desk" },
    { value: "automation", label: tr("Automation"), path: "automation" },
    { value: "resources", label: tr("Resources"), path: "governance?section=resources" },
    { value: "governance", label: tr("Project settings"), path: "governance" },
  ];
  const views = [
    { value: "board", label: tr("Board") },
    { value: "list", label: tr("Table") },
    { value: "calendar", label: tr("Calendar") },
    { value: "timeline", label: tr("Timeline") },
  ];
  const tool = sections.slice(4).find(item => item.value === current);
  return <header className="shrink-0 min-w-0 space-y-3 border-b border-border pb-3">
    <div className="flex items-center justify-between gap-3 min-w-0">
      <div className="min-w-0 flex items-center gap-2">
        <h2 className="truncate text-base font-semibold text-foreground" dir="auto">{project?.name || tr("Project")}</h2>
        {project?.identifier && <span dir="ltr" className="hidden sm:inline text-xs text-foreground/75 shrink-0">{project.identifier}</span>}
      </div>
      <div className="hidden md:block shrink-0">
        <Dropdown ariaLabel={tr("Project tools")} trigger={<span className={"inline-flex items-center gap-2 px-2 py-1 text-sm " + (tool ? "text-primary" : "text-foreground/75")}><span>{tool?.label || tr("Tools")}</span><MoreHorizontal size={18} /></span>}
          items={sections.slice(4).map((item, index) => ({ id: item.value, label: item.label, icon: index === 0 ? <Zap size={16} /> : index === 1 ? <FolderOpen size={16} /> : <Settings size={16} />, onClick: () => navigate(`/p/${projectId}/${item.path}`) }))} />
      </div>
    </div>
    <div className="flex flex-wrap items-center justify-between gap-2 min-w-0">
      <nav aria-label={tr("Project navigation")} className="hidden md:flex flex-wrap items-center gap-1">
        {sections.slice(0, 4).map(item => <Link key={item.value} to={`/p/${projectId}/${item.path}`} aria-current={current === item.value ? "page" : undefined}
          className={"inline-flex min-h-11 items-center rounded-lg px-3 py-2 text-sm font-medium focus-visible:outline-2 focus-visible:outline-primary transition-colors " + (current === item.value ? "bg-primary/10 text-primary" : "text-foreground/75 hover:bg-muted hover:text-foreground")}>{item.label}</Link>)}
      </nav>
      <CustomSelect className="md:hidden min-w-0 flex-1" ariaLabel={tr("Project navigation")} value={current}
        options={sections.map(({ value, label }) => ({ value, label }))}
        onChange={value => { const next = sections.find(item => item.value === value); if (next) navigate(`/p/${projectId}/${next.path}`); }} />
      {inWork && <CustomSelect className="w-36 max-w-[50%] md:ms-auto" ariaLabel={tr("Work view")} value={section} options={views} onChange={view => { if (isWorkView(view)) navigate(`/p/${projectId}/${view}`); }} />}
    </div>
  </header>;
}
