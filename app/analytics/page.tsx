"use client"

import { AppLayoutClient } from '@components/layout/AppLayoutClient'
import { AnalyticsDashboard } from '@features/analytics/components/AnalyticsDashboard'
import { CreditCardStatements } from '@features/analytics/components/CreditCardStatements'
import { BillReconciliation } from '@features/analytics/components/BillReconciliation'
import { useAnalyticsQuery } from '@/lib/query/hooks/useAnalyticsQuery'
import { useAnalyticsFilters } from '@features/analytics/hooks/useAnalyticsFilters'

export default function AnalyticsPage() {
  const { filters } = useAnalyticsFilters()
  const { data: expenses = [], isLoading } = useAnalyticsQuery(filters)

  return (
    <AppLayoutClient>
      <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
        <div className="@container/main flex flex-1 flex-col gap-4">
          <AnalyticsDashboard 
            expenses={expenses} 
            isLoading={isLoading} 
            currency="₹" 
            filters={filters}
          />
          <CreditCardStatements expenses={expenses} />
          <BillReconciliation expenses={expenses} />
        </div>
      </div>
    </AppLayoutClient>
  )
}
