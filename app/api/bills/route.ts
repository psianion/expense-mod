import { NextRequest } from 'next/server'
import { billService } from '@server/services/bill.service'
import { createBillSchema, updateBillSchema } from '@server/validators/bill.schema'
import { BillType } from '@/types'
import { successResponse, handleApiError } from '../middleware'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const typeFilter = request.nextUrl.searchParams
      .get('type')
      ?.split(',')
      .filter(Boolean)
      .map((value) => value.toUpperCase() as BillType)

    const bills = await billService.getBills(typeFilter)
    return successResponse({ bills })
  } catch (error) {
    return handleApiError(error)
  }
}

export async function POST(request: NextRequest) {
  try {
    const input = createBillSchema.parse(await request.json())
    const bill = await billService.createBill(input)
    return successResponse({ bill })
  } catch (error) {
    return handleApiError(error)
  }
}

export async function PUT(request: NextRequest) {
  try {
    const input = updateBillSchema.parse(await request.json())
    if (!input.id) {
      throw new Error('Bill id is required for update')
    }

    const bill = await billService.updateBill(input)
    return successResponse({ bill })
  } catch (error) {
    return handleApiError(error)
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const id = request.nextUrl.searchParams.get('id')
    if (!id) {
      throw new Error('Bill id is required')
    }

    const result = await billService.deleteBill(id)
    return successResponse({ bill: result })
  } catch (error) {
    return handleApiError(error)
  }
}

