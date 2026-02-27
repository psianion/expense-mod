import { NextRequest } from 'next/server'
import { billService } from '@server/services/bill.service'
import { createBillSchema, updateBillSchema } from '@server/validators/bill.schema'
import { requireAuth } from '@server/auth/context'
import { BillType } from '@/types'
import { successResponse, withApiHandler } from '../middleware'

export const dynamic = 'force-dynamic'

export const GET = withApiHandler(async (request: NextRequest) => {
  const user = await requireAuth(request)
  const typeFilter = request.nextUrl.searchParams
    .get('type')
    ?.split(',')
    .filter(Boolean)
    .map((value) => value.toUpperCase() as BillType)

  const bills = await billService.getBills(typeFilter, user)
  return successResponse({ bills })
})

export const POST = withApiHandler(async (request: NextRequest) => {
  const user = await requireAuth(request)
  const input = createBillSchema.parse(await request.json())
  const bill = await billService.createBill(input, user)
  return successResponse({ bill })
})

export const PUT = withApiHandler(async (request: NextRequest) => {
  const user = await requireAuth(request)
  const input = updateBillSchema.parse(await request.json())
  if (!input.id) {
    throw new Error('Bill id is required for update')
  }

  const bill = await billService.updateBill(input, user)
  return successResponse({ bill })
})

export const DELETE = withApiHandler(async (request: NextRequest) => {
  const user = await requireAuth(request)
  const id = request.nextUrl.searchParams.get('id')
  if (!id) {
    throw new Error('Bill id is required')
  }

  const result = await billService.deleteBill(id, user)
  return successResponse({ bill: result })
})

