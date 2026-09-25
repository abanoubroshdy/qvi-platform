import type { Metadata } from "next";
import { Qv1ModelsView } from "@/components/qv1/Qv1ModelsView";
import { buildPageMetadata } from "@/lib/seo";

const pageTitle = "Model sources & licenses";
const pageDescription =
  "Sources and licenses for models used by QV1 Evaluation. BS-RoFormer weights from ZFTurbo are third-party and non-commercial, converted by QVI to ONNX. They are not QVI originals.";

export const metadata: Metadata = buildPageMetadata({
  title: pageTitle,
  description: pageDescription,
  path: "/qv1/models",
});

export default function Qv1ModelsPage() {
  return <Qv1ModelsView />;
}
