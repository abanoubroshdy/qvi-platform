/** Product codes must match desktop `ProductCodes.cs`. */
export const PRODUCT_CODES = {
  neyoraPro: "NEYORA_PRO",
  qv1Pro: "QV1_PRO",
  qv1Eval: "QV1_EVAL",
} as const;

export type ProductCode = (typeof PRODUCT_CODES)[keyof typeof PRODUCT_CODES];

export const KNOWN_PRODUCT_CODES: readonly ProductCode[] = [
  PRODUCT_CODES.neyoraPro,
  PRODUCT_CODES.qv1Pro,
  PRODUCT_CODES.qv1Eval,
];

export function isProductCode(value: string): value is ProductCode {
  return (KNOWN_PRODUCT_CODES as readonly string[]).includes(value);
}

/** Entitlement names match desktop `FeatureId` enum member names. */
export function entitlementsForProduct(code: ProductCode): string[] {
  switch (code) {
    case PRODUCT_CODES.qv1Eval:
      return [];
    case PRODUCT_CODES.qv1Pro:
      return ["ProExport", "CommercialUse", "PremiumModels", "CloudUpdates"];
    case PRODUCT_CODES.neyoraPro:
      return ["ProExport", "CommercialUse", "PremiumModels", "CloudUpdates"];
    default:
      return [];
  }
}