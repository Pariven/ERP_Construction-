import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { Badge } from "@/app/components/Badge";
import { ProjectThumb } from "@/app/components/ProjectThumb";
import { PROJECT_STATUS_TONE, PROJECT_TYPE_LABEL, formatCurrency, formatDate } from "@/lib/format";
import { updateProjectImage } from "../actions";
import { ProjectImageUpload } from "./ProjectImageUpload";
import { ProjectTabs } from "./ProjectTabs";
import { SidebarProjectNav } from "./SidebarProjectNav";

export default async function ProjectLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const project = await prisma.project.findUnique({ where: { id } });
  if (!project) notFound();

  return (
    <div className="flex flex-col gap-6">
      <SidebarProjectNav projectId={project.id} projectName={project.name} />
      <div>
        <Link href="/projects" className="text-xs text-text-muted hover:text-text-secondary md:hidden">
          ← Dashboard
        </Link>
        <div className="mt-2 flex flex-wrap items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="flex flex-col items-center gap-1">
              <ProjectThumb imageUrl={project.imageUrl} updatedAt={project.updatedAt} name={project.name} size={56} />
              <ProjectImageUpload action={updateProjectImage.bind(null, project.id)} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-semibold tracking-tight">{project.name}</h1>
                <Badge
                  tone={PROJECT_STATUS_TONE[project.status] ?? "neutral"}
                  label={project.status.replace("_", " ")}
                />
              </div>
              <p className="mt-1 text-sm text-text-secondary">
                {project.clientName} · {PROJECT_TYPE_LABEL[project.type] ?? project.type} ·{" "}
                {formatDate(project.startDate)}
                {project.endDate ? ` – ${formatDate(project.endDate)}` : ""}
              </p>
            </div>
          </div>
          <div className="text-right">
            <div className="text-xs text-text-muted">Contract value</div>
            <div className="text-lg font-semibold tabular-nums">
              {formatCurrency(project.contractValue)}
            </div>
          </div>
        </div>
      </div>

      <div className="md:hidden">
        <ProjectTabs projectId={project.id} />
      </div>

      {children}
    </div>
  );
}
