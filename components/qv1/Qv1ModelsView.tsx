"use client";

import Link from "next/link";
import { useI18n } from "@/components/i18n/I18nProvider";
import { qv1AppCopyright, qv1Dependencies, qv1ModelSources } from "@/lib/qv1-models";

export function Qv1ModelsView() {
  const { copy } = useI18n();
  const page = copy.qv1Models;

  return (
    <div className="mx-auto max-w-5xl px-4 py-14 sm:py-16">
      <p className="text-xs font-semibold uppercase tracking-[0.22em] text-primary">
        <Link href="/qv1" className="hover:underline">
          QV1 Evaluation
        </Link>
      </p>
      <h1 className="mt-3 text-4xl font-semibold tracking-tight sm:text-5xl">{page.title}</h1>
      <p className="mt-4 max-w-3xl text-base leading-7 text-muted-foreground sm:text-lg">{page.lead}</p>

      <div className="mt-10 overflow-x-auto rounded-2xl border border-border">
        <table className="w-full min-w-[44rem] border-collapse text-start text-sm">
          <thead className="bg-muted/60 text-muted-foreground">
            <tr>
              <th scope="col" className="px-4 py-3 font-medium">
                {page.colName}
              </th>
              <th scope="col" className="px-4 py-3 font-medium">
                {page.colSource}
              </th>
              <th scope="col" className="px-4 py-3 font-medium">
                {page.colFormat}
              </th>
              <th scope="col" className="px-4 py-3 font-medium">
                {page.colLicense}
              </th>
              <th scope="col" className="px-4 py-3 font-medium">
                {page.colSha}
              </th>
            </tr>
          </thead>
          <tbody>
            {qv1ModelSources.map((model) => (
              <tr key={model.id} className="border-t border-border align-top">
                <th scope="row" className="px-4 py-4 text-start font-semibold text-foreground">
                  {model.name}
                </th>
                <td className="px-4 py-4 leading-6">
                  <a className="font-medium text-primary underline-offset-4 hover:underline" href={model.sourceUrl}>
                    {model.sourceName}
                  </a>
                  <span aria-hidden="true"> · </span>
                  <a className="font-medium text-primary underline-offset-4 hover:underline" href={model.releaseUrl}>
                    {model.releaseName}
                  </a>
                </td>
                <td className="px-4 py-4 leading-6">{page.formatValue}</td>
                <td className="px-4 py-4 leading-6 text-muted-foreground">{page.license}</td>
                <td className="px-4 py-4">
                  {model.sha256.trim() ? (
                    <p className="max-w-xs overflow-x-auto whitespace-pre-wrap break-all font-mono text-xs leading-5">
                      {model.sha256.trim()}
                    </p>
                  ) : (
                    <p className="text-muted-foreground">{page.shaMissing}</p>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-3 text-sm leading-6 text-muted-foreground">{page.notOriginal}</p>

      <h2 className="mt-14 text-2xl font-semibold">{page.runtimeTitle}</h2>
      <div className="mt-4 overflow-x-auto rounded-2xl border border-border">
        <table className="w-full min-w-[32rem] border-collapse text-start text-sm">
          <thead className="bg-muted/60 text-muted-foreground">
            <tr>
              <th scope="col" className="px-4 py-3 font-medium">
                {page.colName}
              </th>
              <th scope="col" className="px-4 py-3 font-medium">
                {page.colLicense}
              </th>
              <th scope="col" className="px-4 py-3 font-medium">
                {page.colSource}
              </th>
            </tr>
          </thead>
          <tbody>
            {qv1Dependencies.map((item) => (
              <tr key={item.id} className="border-t border-border">
                <th scope="row" className="px-4 py-4 text-start font-semibold">
                  {item.name}
                </th>
                <td className="px-4 py-4 text-muted-foreground">{item.license}</td>
                <td className="px-4 py-4">
                  <a className="font-medium text-primary underline-offset-4 hover:underline" href={item.url}>
                    {page.openSource}
                  </a>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="mt-8 text-sm leading-7 text-foreground">
        {page.copyrightBefore} {qv1AppCopyright.year} {qv1AppCopyright.holder}
        {page.copyrightAfter}
      </p>
    </div>
  );
}
