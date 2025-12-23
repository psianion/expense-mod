"use client"

import Link from 'next/link'
import { ExternalLink } from 'lucide-react'
import dayjs from 'dayjs'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { useUpcomingBillInstancesQuery } from '@/lib/query/hooks'
import { formatPrice } from '@/lib/formatPrice'

export function BillsPreviewCard() {
  const { data: billInstances = [], isLoading } = useUpcomingBillInstancesQuery(5)

  const totalAmount = billInstances.reduce((sum, instance) => sum + instance.amount, 0)

  if (isLoading) {
    return (
      <Card className="relative">
        <CardHeader className="pb-2">
          <Skeleton className="h-5 w-20" />
          <Skeleton className="h-4 w-40" />
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="relative">
      <Link
        href="/bills"
        className="absolute top-3 right-3 p-1 rounded-full hover:bg-muted transition-colors"
        aria-label="View all bills"
      >
        <ExternalLink className="h-4 w-4" />
      </Link>

      <CardHeader className="pb-2">
        <CardTitle className="text-lg">Upcoming Bills</CardTitle>
        <CardDescription>
          {billInstances.length} bill{billInstances.length !== 1 ? 's' : ''} • {formatPrice(totalAmount)}
        </CardDescription>
      </CardHeader>

      <CardContent>
        {billInstances.length === 0 ? (
          <p className="text-sm text-muted-foreground">No upcoming bills</p>
        ) : (
          <div className="space-y-2">
            {billInstances.map((instance) => (
              <div key={instance.id} className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <span className="truncate max-w-[120px]" title={instance.bill?.name || 'Unknown'}>
                    {instance.bill?.name || 'Unknown'}
                  </span>
                  <Badge variant="outline" className="text-xs">
                    {dayjs(instance.due_date).format('MMM D')}
                  </Badge>
                </div>
                <span className="font-medium">{formatPrice(instance.amount)}</span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
