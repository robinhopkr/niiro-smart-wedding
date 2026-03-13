import 'server-only'

import { createAdminClient } from '@/lib/supabase/admin'
import { createPublicClient } from '@/lib/supabase/public'
import { getBillingAccessState } from '@/lib/billing/access'
import { saveStoredBillingRecord as persistStoredBillingRecord, type StoredBillingRecord } from '@/lib/supabase/repository'
import type { WeddingConfig } from '@/types/wedding'

function getBillingPersistenceClient() {
  return createAdminClient() ?? createPublicClient()
}

export async function persistBillingAccessState(
  config: WeddingConfig,
  values: StoredBillingRecord,
) {
  const supabase = getBillingPersistenceClient()
  await persistStoredBillingRecord(supabase, config, values)
  return getBillingAccessState(supabase, config, values.email)
}
