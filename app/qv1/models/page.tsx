import type { Metadata } from "next";
import { JsonLd } from "@/components/JsonLd";
import { Qv1ModelsView } from "@/components/qv1/Qv1ModelsView";
import { buildPageMetadata, qv1ModelsPageJsonLd } from "@/lib/seo";

const pageTitle = "Model sources & licenses";
const pageDescription =
  "Sources and licenses for models used by QV1 Evaluation. BS-RoFormer weights from ZFTurbo are third-party and non-commercial, converted by QVI to ONNX. They are not QVI originals.";

export const metadata: Metadata = buildPageMetadata({
  title: pageTitle,
  description: pageDescription,
  path: "/qv1/models",
});

export default function Qv1ModelsPage() {
  return (
    <>
      <JsonLd data={qv1ModelsPageJsonLd()} />
      <Qv1ModelsView />
    </>
  );
}
