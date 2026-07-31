import { prisma } from "@/lib/prisma";
import { DOCUMENT_CATEGORIES, DOCUMENT_CATEGORY_LABEL, formatDate } from "@/lib/format";
import { deleteDocument, uploadDocument } from "./actions";

export const dynamic = "force-dynamic";

export default async function DocumentsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const documents = await prisma.document.findMany({
    where: { projectId: id },
    orderBy: { uploadedAt: "desc" },
  });

  const byCategory = DOCUMENT_CATEGORIES.map((category) => ({
    category,
    docs: documents.filter((d) => d.category === category),
  })).filter((g) => g.docs.length > 0);

  return (
    <div className="flex flex-col gap-6">
      {documents.length === 0 && (
        <div className="rounded-lg border border-dashed border-[var(--border-hairline)] p-8 text-center text-sm text-text-secondary">
          No documents yet — upload drawings, contracts, or correspondence below. VOs and disputes often hinge on
          which revision you were working to, so it&apos;s worth keeping these here.
        </div>
      )}

      <div className="flex flex-col gap-4">
        {byCategory.map(({ category, docs }) => (
          <div key={category} className="rounded-lg border border-[var(--border-hairline)] bg-surface-1 p-4">
            <h2 className="mb-3 text-sm font-semibold text-text-primary">{DOCUMENT_CATEGORY_LABEL[category]}</h2>
            <div className="flex flex-col divide-y divide-[var(--gridline)]">
              {docs.map((doc) => (
                <div key={doc.id} className="flex items-center justify-between gap-3 py-2.5 first:pt-0 last:pb-0">
                  <div className="min-w-0">
                    <a
                      href={doc.fileUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="truncate text-sm font-medium text-cat-1 hover:underline"
                    >
                      {doc.name}
                    </a>
                    <div className="text-xs text-text-muted">
                      {doc.version && <span>{doc.version} · </span>}
                      Uploaded {formatDate(doc.uploadedAt)}
                      {doc.notes && <span> · {doc.notes}</span>}
                    </div>
                  </div>
                  <form action={deleteDocument.bind(null, id, doc.id)}>
                    <button className="shrink-0 text-xs text-text-muted hover:text-[var(--status-critical)]">
                      Remove
                    </button>
                  </form>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      <details className="rounded-lg border border-[var(--border-hairline)] bg-surface-1 p-4" open={documents.length === 0}>
        <summary className="cursor-pointer text-sm font-medium text-text-primary">+ Upload document</summary>
        <form action={uploadDocument.bind(null, id)} className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-text-secondary">Category</span>
            <select
              name="category"
              className="rounded-md border border-[var(--border-hairline)] bg-page px-3 py-2 text-sm outline-none focus:border-cat-1"
            >
              {DOCUMENT_CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {DOCUMENT_CATEGORY_LABEL[c]}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-text-secondary">Version / revision (optional)</span>
            <input
              name="version"
              placeholder="Rev C"
              className="rounded-md border border-[var(--border-hairline)] bg-page px-3 py-2 text-sm outline-none focus:border-cat-1"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm sm:col-span-2">
            <span className="text-text-secondary">Name</span>
            <input
              name="name"
              required
              placeholder="Structural drawings — Block B"
              className="rounded-md border border-[var(--border-hairline)] bg-page px-3 py-2 text-sm outline-none focus:border-cat-1"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm sm:col-span-2">
            <span className="text-text-secondary">Notes (optional)</span>
            <input
              name="notes"
              className="rounded-md border border-[var(--border-hairline)] bg-page px-3 py-2 text-sm outline-none focus:border-cat-1"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm sm:col-span-2">
            <span className="text-text-secondary">File (PDF, image, Word, or Excel)</span>
            <input
              name="file"
              type="file"
              required
              accept=".pdf,.doc,.docx,.xls,.xlsx,.txt,image/*"
              className="rounded-md border border-[var(--border-hairline)] bg-page px-3 py-2 text-sm outline-none focus:border-cat-1"
            />
          </label>
          <div className="sm:col-span-2">
            <button
              type="submit"
              className="rounded-md bg-cat-1 px-4 py-2 text-sm font-medium text-white hover:opacity-90"
            >
              Upload
            </button>
          </div>
        </form>
      </details>
    </div>
  );
}
