import type { Company } from "@/data/types";
import type { DocumentContent } from "@/lib/documents";

interface DocumentPaperProps {
  content: DocumentContent;
  company?: Company | null;
  consecutive?: string;
  signed?: boolean;
}

interface SignatureParagraphProps {
  paragraph: string;
  content: DocumentContent;
  company?: Company | null;
  signed: boolean;
}

const SignatureParagraph = ({
  paragraph,
  content,
  company,
  signed,
}: SignatureParagraphProps) => {
  const isSignature = /\{\{firma:(empleador|trabajador)\}\}/.test(paragraph);
  if (!isSignature) {
    return (
      <p className="mt-1 whitespace-pre-line text-[11px] text-muted-foreground">
        {paragraph}
      </p>
    );
  }

  const isEmployer = paragraph.includes("{{firma:empleador}}");
  const signature = isEmployer
    ? signed
      ? company?.signatureData
      : undefined
    : content.signature;

  return (
    <div className="mt-1 text-[11px] text-muted-foreground">
      {paragraph.split("\n").map((line, index) => {
        if (/\{\{firma:(empleador|trabajador)\}\}/.test(line)) {
          return signature ? (
            <img
              key={`sig-${index}`}
              src={signature}
              alt="Firma"
              crossOrigin="anonymous"
              className="my-1 h-14 w-auto object-contain"
            />
          ) : (
            <div
              key={`line-${index}`}
              className="my-4 h-px w-40 bg-muted-foreground/40"
            />
          );
        }
        if (!line.trim()) return null;
        return <p key={`text-${index}`}>{line}</p>;
      })}
    </div>
  );
};

export const DocumentPaper = ({
  content,
  company,
  consecutive,
  signed = false,
}: DocumentPaperProps) => (
  <div className="relative overflow-hidden rounded-xl border border-border bg-card p-5 font-serif text-[12px] leading-relaxed text-card-foreground shadow-soft">
    {company?.logoData ? (
      <img
        src={company.logoData}
        alt=""
        aria-hidden
        crossOrigin="anonymous"
        className="pointer-events-none absolute left-1/2 top-1/2 w-2/3 -translate-x-1/2 -translate-y-1/2 opacity-[0.06]"
      />
    ) : null}

    <div className="relative">
      {company ? (
        <div className="mb-2 flex items-stretch border border-border">
          <div className="flex w-28 shrink-0 items-center justify-center border-r border-border p-2">
            {company.logoData ? (
              <img
                src={company.logoData}
                alt={company.name}
                crossOrigin="anonymous"
                className="max-h-10 w-auto object-contain"
              />
            ) : (
              <p className="text-center text-[9px] font-bold uppercase leading-tight text-foreground">
                {company.name}
              </p>
            )}
          </div>
          <div className="flex min-w-0 flex-1 flex-col items-center justify-center px-3 py-2 text-center">
            <p className="font-display text-[11px] font-bold uppercase leading-tight text-foreground">
              {content.title}
            </p>
            <p className="mt-0.5 text-[9px] italic text-muted-foreground">
              {content.subtitle}
            </p>
          </div>
          <div className="w-24 shrink-0 border-l border-border p-2 text-[8px] leading-snug text-muted-foreground">
            <p>Código: {company.letterheadCode || "GH-FOR-01"}</p>
            <p>Versión: {company.letterheadVersion || "01"}</p>
            <p>Vigencia: {company.letterheadValidity || "Vigente"}</p>
          </div>
        </div>
      ) : (
        <div className="border-b border-border pb-3 text-center">
          <p className="font-display text-base font-bold uppercase tracking-wide">
            {content.title}
          </p>
          <p className="mt-0.5 text-[11px] italic text-muted-foreground">
            {content.subtitle}
          </p>
        </div>
      )}

      {company ? (
        <p className="mb-2 text-right text-[9px] font-semibold text-foreground">
          No. {consecutive || "—"} ·{" "}
          {new Date().toLocaleDateString("es-CO", {
            day: "2-digit",
            month: "long",
            year: "numeric",
          })}
        </p>
      ) : null}

      <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-[10.5px] text-muted-foreground">
        {content.meta.map((item) => (
          <p key={item.label}>
            <span className="font-semibold text-foreground">{item.label}:</span>{" "}
            {item.value}
          </p>
        ))}
      </div>
      <div className="mt-4 space-y-3">
        {content.sections.map((section) => (
          <div key={section.heading}>
            <p className="text-[11px] font-bold uppercase tracking-wide text-foreground">
              {section.heading}
            </p>
            {section.body.map((paragraph, index) => (
              <SignatureParagraph
                key={`${section.heading}-${index}`}
                paragraph={paragraph}
                content={content}
                company={company}
                signed={signed}
              />
            ))}
          </div>
        ))}
      </div>
      <p className="mt-4 border-t border-border pt-2 text-[9px] leading-snug text-muted-foreground">
        {content.footer}
      </p>

      {company ? (
        <p className="mt-2 border-t border-border pt-1.5 text-center text-[8px] leading-snug text-muted-foreground">
          {company.name.toUpperCase()} | NIT {company.nit} · {company.address},{" "}
          {company.city} · Tel. {company.phone}
        </p>
      ) : null}
    </div>
  </div>
);
