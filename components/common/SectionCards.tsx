"use client"

import * as React from "react"
import { ArrowUpRight, ArrowDownRight, TrendingUp } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { StaggerContainer, StaggerItem, AnimatedNumber, AnimatedIcon, AnimatedCard } from "@/components/animations"

interface SectionCardsProps {
  expenseTotal: number
  inflowTotal: number
  net: number
  currency: string
}

export function SectionCards({ expenseTotal, inflowTotal, net, currency }: SectionCardsProps) {
  return (
    <StaggerContainer className="grid gap-4 md:grid-cols-3">
      <StaggerItem>
        <AnimatedCard className="transition-all duration-200 hover:shadow-lg">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Expenses</CardTitle>
            <AnimatedIcon
              icon={ArrowDownRight}
              className="h-4 w-4 text-muted-foreground"
              hoverScale={1.2}
              hoverRotate={-10}
            />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {currency}{" "}
              <AnimatedNumber
                value={expenseTotal}
                decimals={2}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              All time expenses
            </p>
          </CardContent>
        </AnimatedCard>
      </StaggerItem>

      <StaggerItem>
        <AnimatedCard className="transition-all duration-200 hover:shadow-lg">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Inflows</CardTitle>
            <AnimatedIcon
              icon={ArrowUpRight}
              className="h-4 w-4 text-muted-foreground"
              hoverScale={1.2}
              hoverRotate={10}
            />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {currency}{" "}
              <AnimatedNumber
                value={inflowTotal}
                decimals={2}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              All time income
            </p>
          </CardContent>
        </AnimatedCard>
      </StaggerItem>

      <StaggerItem>
        <AnimatedCard className="transition-all duration-200 hover:shadow-lg">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Net Balance</CardTitle>
            <AnimatedIcon
              icon={TrendingUp}
              className="h-4 w-4 text-muted-foreground"
              hoverScale={1.1}
              hoverRotate={5}
            />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${net >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {net >= 0 ? '+' : ''}{currency}{" "}
              <AnimatedNumber
                value={Math.abs(net)}
                decimals={2}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              {net >= 0 ? 'Surplus' : 'Deficit'}
            </p>
          </CardContent>
        </AnimatedCard>
      </StaggerItem>
    </StaggerContainer>
  )
}

