import { defineCloudflareConfig } from "@opennextjs/cloudflare";

/**
 * Phase 1 has no ISR, revalidatePath, or revalidateTag.
 * The dummy cache is the adapter default and does not need a D1, KV, or R2 binding.
 * HTML is dynamic because the root layout reads request headers.
 */
export default defineCloudflareConfig();
