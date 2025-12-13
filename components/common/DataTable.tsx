"use client"

import * as React from "react"
import dayjs from "dayjs"
import { ArrowUpRight, ArrowDownRight } from "lucide-react"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Expense } from "../../types"

interface DataTableProps {
  expenses: Expense[]
  isLoading: boolean
  currency: string
}

export function DataTable({ expenses, isLoading, currency }: DataTableProps) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Recent Expenses</CardTitle>
          <CardDescription>Your expense history</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
            <p className="text-muted-foreground mt-2">Loading expenses...</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (expenses.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Recent Expenses</CardTitle>
          <CardDescription>Your expense history</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <p className="text-muted-foreground">No expenses yet. Add your first expense!</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent Expenses</CardTitle>
        <CardDescription>
          {expenses.length} expense{expenses.length !== 1 ? 's' : ''} found
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Platform</TableHead>
                <TableHead>Payment Method</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Source</TableHead>
                <TableHead>Notes</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {expenses.map((expense) => (
                <TableRow key={expense.id}>
                  <TableCell className="font-medium">
                    {dayjs(expense.datetime).isValid() 
                      ? dayjs(expense.datetime).format('MMM DD, YYYY HH:mm') 
                      : expense.datetime}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <span className={`${expense.type === 'EXPENSE' ? 'text-red-600' : 'text-green-600'}`}>
                        {expense.type === 'EXPENSE' ? (
                          <ArrowDownRight className="h-4 w-4 inline" />
                        ) : (
                          <ArrowUpRight className="h-4 w-4 inline" />
                        )}
                      </span>
                      <span className="font-medium">
                        {expense.currency} {expense.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    {expense.category ? (
                      <Badge variant="secondary">{expense.category}</Badge>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {expense.platform || <span className="text-muted-foreground">-</span>}
                  </TableCell>
                  <TableCell>
                    {expense.payment_method || <span className="text-muted-foreground">-</span>}
                  </TableCell>
                  <TableCell>
                    <Badge variant={expense.type === 'EXPENSE' ? 'destructive' : 'default'}>
                      {expense.type}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={expense.source === 'RECURRING' ? 'default' : 'secondary'}>
                      {expense.source}
                    </Badge>
                  </TableCell>
                  <TableCell className="max-w-[200px] truncate">
                    {expense.notes || <span className="text-muted-foreground">-</span>}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  )
}

