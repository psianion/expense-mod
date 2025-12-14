import dayjs, { Dayjs } from 'dayjs'
import utc from 'dayjs/plugin/utc'

import { supabase } from '@server/db/supabase'
import { toUTC } from './datetime'
import { Bill, BillFrequency, BillInstance, BillInstanceStatus, BillType, Expense, ExpenseType, ExpenseSource } from '@/types'

dayjs.extend(utc)

const BILL_EXPENSE_TYPES: BillType[] = ['BILL', 'EMI', 'CREDITCARD', 'SUBSCRIPTION']
const BILL_INFLOW_TYPES: BillType[] = ['SALARY', 'INCOME']

const PERIOD_START_UNIT: Record<BillFrequency, dayjs.OpUnitType> = {
  MONTHLY: 'month',
  WEEKLY: 'week',
  YEARLY: 'year',
}

const PERIOD_END_UNIT: Record<BillFrequency, dayjs.OpUnitType> = {
  MONTHLY: 'month',
  WEEKLY: 'week',
  YEARLY: 'year',
}

export const billToExpenseType = (type: BillType): ExpenseType => {
  const normalizedType = (type as string).toUpperCase() as BillType
  return BILL_INFLOW_TYPES.includes(normalizedType) ? 'INFLOW' : 'EXPENSE'
}

const formatDate = (date: Dayjs) => date.utc().format('YYYY-MM-DD')

export const getPeriodWindow = (frequency: BillFrequency, reference = dayjs()): { start: Dayjs; end: Dayjs } => {
  const normalizedFrequency = (frequency as string).toUpperCase() as BillFrequency
  const start = reference.startOf(PERIOD_START_UNIT[normalizedFrequency])
  const end = reference.endOf(PERIOD_END_UNIT[normalizedFrequency])
  return { start, end }
}

export const isBillActiveForDate = (bill: Bill, reference = dayjs()): boolean => {
  if (bill.start_date && dayjs(bill.start_date).isAfter(reference, 'day')) {
    return false
  }
  if (bill.end_date && dayjs(bill.end_date).isBefore(reference, 'day')) {
    return false
  }
  return true
}

export const hasGeneratedThisPeriod = (bill: Bill, frequency: BillFrequency, reference = dayjs()): boolean => {
  if (!bill.last_generated_at) return false
  const { start, end } = getPeriodWindow(frequency, reference)
  const last = dayjs(bill.last_generated_at)
  return last.isAfter(start) && last.isBefore(end)
}

export const computeDueDateForPeriod = (bill: Bill, reference = dayjs()): Dayjs => {
  const normalizedFrequency = (bill.frequency as string).toUpperCase() as BillFrequency

  if (normalizedFrequency === 'MONTHLY') {
    const base = reference.startOf('month')
    const day = Math.min(Math.max(bill.day_of_month ?? reference.date(), 1), base.daysInMonth())
    return base.date(day)
  }

  if (normalizedFrequency === 'WEEKLY') {
    const startOfWeek = reference.startOf('week') // Sunday start
    const day = Math.min(Math.max(bill.day_of_week ?? 0, 0), 6)
    return startOfWeek.add(day, 'day')
  }

  const anchor = bill.start_date ? dayjs(bill.start_date) : reference
  const yearly = reference.startOf('year').month(anchor.month()).date(anchor.date())
  return yearly
}

export const instanceExistsForPeriod = async (
  bill: Bill,
  frequency: BillFrequency,
  reference = dayjs()
): Promise<boolean> => {
  const { start, end } = getPeriodWindow(frequency, reference)
  const { data, error } = await supabase
    .from('bill_instances')
    .select('id')
    .eq('bill_id', bill.id)
    .gte('due_date', formatDate(start))
    .lte('due_date', formatDate(end))
    .limit(1)

  if (error) {
    console.error('Error checking bill_instances window', error)
    return true
  }

  return Boolean(data && data.length > 0)
}

export const findInstanceForPeriod = async (
  bill: Bill,
  frequency: BillFrequency,
  reference = dayjs()
): Promise<BillInstance | null> => {
  const { start, end } = getPeriodWindow(frequency, reference)
  const { data, error } = await supabase
    .from('bill_instances')
    .select('*')
    .eq('bill_id', bill.id)
    .gte('due_date', formatDate(start))
    .lte('due_date', formatDate(end))
    .order('due_date', { ascending: true })
    .limit(1)
    .single()

  if (error) {
    if (error.code !== 'PGRST116') {
      console.error('Error fetching bill_instances window', error)
    }
    return null
  }

  return data as BillInstance
}

type CreateInstanceOptions = {
  amount?: number | null
  status?: BillInstanceStatus
}

export const createInstanceRecord = async (
  bill: Bill,
  dueDate: Dayjs,
  options: CreateInstanceOptions = {}
): Promise<BillInstance | null> => {
  const amount = options.amount ?? bill.amount ?? 0
  const status: BillInstanceStatus = options.status ?? (bill.auto_post && amount > 0 ? 'PAID' : 'DUE')

  const insertPayload = {
    bill_id: bill.id,
    user_id: bill.user_id,
    due_date: formatDate(dueDate),
    amount,
    status,
  }

  const { data, error } = await supabase
    .from('bill_instances')
    .insert([insertPayload])
    .select()
    .single()

  if (error) {
    console.error('Error creating bill instance', error)
    return null
  }

  return data as BillInstance
}

type ExpenseInsert = Omit<Expense, 'id' | 'created_at' | 'bill_instance'> & { datetime: string }

export const buildExpensePayload = (bill: Bill, instance: BillInstance, amount: number): ExpenseInsert => {
  const expenseType = billToExpenseType(bill.type)
  const billDate = `${instance.due_date}T00:00:00`
  const datetimeUTC = toUTC(billDate)

  const payload: ExpenseInsert = {
    user_id: bill.user_id,
    amount,
    currency: 'INR',
    datetime: datetimeUTC,
    category: expenseType === 'INFLOW' ? 'Income' : 'Bills',
    platform: null,
    payment_method: null,
    type: expenseType,
    event: bill.name,
    notes: bill.notes,
    parsed_by_ai: false,
    raw_text: null,
    source: 'RECURRING' as ExpenseSource,
    bill_instance_id: instance.id,
  }

  return payload
}

export const createExpenseForInstance = async (
  bill: Bill,
  instance: BillInstance,
  amount: number
): Promise<Expense | null> => {
  const expensePayload = buildExpensePayload(bill, instance, amount)
  const { data, error } = await supabase
    .from('expenses')
    .insert([expensePayload])
    .select()
    .single()

  if (error) {
    console.error('Error creating expense for bill instance', error)
    return null
  }

  return data as Expense
}

export const markBillGenerated = async (bill: Bill, dueDate: Dayjs) => {
  const { error } = await supabase
    .from('bills')
    .update({
      last_generated_at: new Date().toISOString(),
      last_bill_created: dueDate.toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', bill.id)

  if (error) {
    console.error('Error updating bill metadata', error)
  }
}

export const ensureInstanceForCurrentPeriod = async (
  bill: Bill,
  reference = dayjs()
): Promise<{
  created?: BillInstance | null
  expense?: Expense | null
  skippedReason?: string
}> => {
  if (!isBillActiveForDate(bill, reference)) {
    return { skippedReason: 'inactive' }
  }

  if (hasGeneratedThisPeriod(bill, bill.frequency, reference)) {
    return { skippedReason: 'already_generated' }
  }

  const exists = await instanceExistsForPeriod(bill, bill.frequency, reference)
  if (exists) {
    return { skippedReason: 'existing_instance' }
  }

  const dueDate = computeDueDateForPeriod(bill, reference)
  const canAutoPost = bill.auto_post && (bill.amount ?? 0) > 0
  const status: BillInstanceStatus = canAutoPost ? 'PAID' : 'DUE'

  const instance = await createInstanceRecord(bill, dueDate, {
    status,
    amount: bill.amount ?? 0,
  })

  if (!instance) {
    return { skippedReason: 'create_failed' }
  }

  let expense: Expense | null = null
  if (status === 'PAID' && canAutoPost) {
    expense = await createExpenseForInstance(bill, instance, bill.amount ?? 0)
    if (expense) {
      await supabase
        .from('bill_instances')
        .update({ posted_expense_id: expense.id })
        .eq('id', instance.id)
    }
  }

  await markBillGenerated(bill, dueDate)

  return { created: instance, expense }
}

