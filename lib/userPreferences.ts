import type { CreditCard } from './constants'
import { DEFAULT_CATEGORIES, DEFAULT_PLATFORMS, DEFAULT_PAYMENT_METHODS } from './constants'

export type UserPreferences = {
  categories: string[]
  platforms: string[]
  paymentMethods: string[]
  creditCards: CreditCard[]
}

export const getDefaultPreferences = (): UserPreferences => ({
  categories: [],
  platforms: [],
  paymentMethods: [],
  creditCards: []
})

export const getUserPreferences = (): UserPreferences => {
  if (typeof window === 'undefined') return getDefaultPreferences()

  const stored = localStorage.getItem('expense-tracker-preferences')
  if (!stored) return getDefaultPreferences()

  const parsed = { ...getDefaultPreferences(), ...JSON.parse(stored) }

  // Migrate credit cards from payment_due_offset to payment_due_day
  if (parsed.creditCards && parsed.creditCards.length > 0) {
    parsed.creditCards = parsed.creditCards.map((card: any) => {
      if ('payment_due_offset' in card && !('payment_due_day' in card)) {
        // Convert offset to due day: add offset days to statement day
        const statementDay = card.statement_day
        const offset = card.payment_due_offset
        let dueDay = statementDay + offset

        // Handle month overflow - if due day exceeds 31, wrap to next month
        if (dueDay > 31) {
          dueDay = dueDay - 31
        }

        // Ensure due day is valid (1-31)
        dueDay = Math.max(1, Math.min(31, dueDay))

        return {
          ...card,
          payment_due_day: dueDay,
        }
      }
      return card
    })

    // Save migrated preferences back to localStorage
    localStorage.setItem('expense-tracker-preferences', JSON.stringify(parsed))
  }

  return parsed
}

export const saveUserPreferences = (preferences: Partial<UserPreferences>): void => {
  if (typeof window === 'undefined') return

  const current = getUserPreferences()
  const updated = { ...current, ...preferences }
  localStorage.setItem('expense-tracker-preferences', JSON.stringify(updated))
}

export const getCombinedCategories = (): string[] => {
  const prefs = getUserPreferences()
  return [...DEFAULT_CATEGORIES, ...prefs.categories.filter((cat: string) => !(DEFAULT_CATEGORIES as readonly string[]).includes(cat))]
}

export const getCombinedPlatforms = (): string[] => {
  const prefs = getUserPreferences()
  return [...DEFAULT_PLATFORMS, ...prefs.platforms.filter((platform: string) => !(DEFAULT_PLATFORMS as readonly string[]).includes(platform))]
}

export const getCombinedPaymentMethods = (): string[] => {
  const prefs = getUserPreferences()
  const creditCardNames = prefs.creditCards.map((card: any) => card.name)
  return [...DEFAULT_PAYMENT_METHODS, ...prefs.paymentMethods.filter((method: string) => !(DEFAULT_PAYMENT_METHODS as readonly string[]).includes(method)), ...creditCardNames]
}

export const addUserCategory = (category: string): void => {
  const prefs = getUserPreferences()
  if (!prefs.categories.includes(category)) {
    saveUserPreferences({
      categories: [...prefs.categories, category]
    })
  }
}

export const addUserPlatform = (platform: string): void => {
  const prefs = getUserPreferences()
  if (!prefs.platforms.includes(platform)) {
    saveUserPreferences({
      platforms: [...prefs.platforms, platform]
    })
  }
}

export const addUserPaymentMethod = (method: string): void => {
  const prefs = getUserPreferences()
  if (!prefs.paymentMethods.includes(method)) {
    saveUserPreferences({
      paymentMethods: [...prefs.paymentMethods, method]
    })
  }
}

export const addCreditCard = (card: Omit<CreditCard, 'id'>): void => {
  const prefs = getUserPreferences()
  const newCard: CreditCard = {
    ...card,
    id: `card_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }
  saveUserPreferences({
    creditCards: [...prefs.creditCards, newCard]
  })
}

export const updateCreditCard = (cardId: string, updates: Partial<Omit<CreditCard, 'id'>>): void => {
  const prefs = getUserPreferences()
  const updatedCards = prefs.creditCards.map(card =>
    card.id === cardId ? { ...card, ...updates } : card
  )
  saveUserPreferences({ creditCards: updatedCards })
}

export const removeCreditCard = (cardId: string): void => {
  const prefs = getUserPreferences()
  saveUserPreferences({
    creditCards: prefs.creditCards.filter(card => card.id !== cardId)
  })
}

export const findCreditCardByPaymentMethod = (paymentMethod: string): CreditCard | null => {
  const prefs = getUserPreferences()
  return prefs.creditCards.find(card => card.name === paymentMethod) || null
}
