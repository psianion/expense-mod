import { NextRequest, NextResponse } from 'next/server'
import { billService } from '@server/services/bill.service'
import { createBillSchema, updateBillSchema } from '@server/validators/bill.schema'
import { BillType } from '@/types'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const typeFilter = request.nextUrl.searchParams
    .get('type')
    ?.split(',')
    .filter(Boolean)
    .map((value) => value.toUpperCase() as BillType)

  const bills = await billService.getBills(typeFilter)
  return NextResponse.json({ bills })
}

export async function POST(request: NextRequest) {
  try {
    const input = createBillSchema.parse(await request.json())
    const bill = await billService.createBill(input)
    return NextResponse.json({ bill })
  } catch (err: any) {
    const message = err?.issues?.[0]?.message || err.message || 'Invalid payload'
    return NextResponse.json({ error: message }, { status: 400 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const input = updateBillSchema.parse(await request.json())
    if (!input.id) {
      return NextResponse.json({ error: 'Bill id is required for update' }, { status: 400 })
    }

    const bill = await billService.updateBill(input)
    return NextResponse.json({ bill })
  } catch (err: any) {
    const message = err?.issues?.[0]?.message || err.message || 'Invalid payload'
    return NextResponse.json({ error: message }, { status: 400 })
  }
}

export async function DELETE(request: NextRequest) {
  const id = request.nextUrl.searchParams.get('id') ?? undefined
  if (!id) {
    return NextResponse.json({ error: 'Bill id is required' }, { status: 400 })
  }

  const result = await billService.deleteBill(id)
  return NextResponse.json({ bill: result })
}

