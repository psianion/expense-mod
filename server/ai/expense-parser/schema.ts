// JSON Schemas for AI structured outputs

export const expenseSchema = {
  type: "object",
  properties: {
    amount: {
      type: ["number", "null"],
      description: "The monetary amount of the expense or income"
    },
    currency: {
      type: ["string", "null"],
      description: "Optional currency code (e.g. INR); not stored in DB, for context only"
    },
    datetime: {
      type: ["string", "null"],
      description: "Date and time in ISO8601 format (YYYY-MM-DDTHH:mm:ss) representing local time, or null if not specified"
    },
    category: {
      type: ["string", "null"],
      description: "Category of the expense (e.g., Food, Transport, Accommodation)"
    },
    platform: {
      type: ["string", "null"],
      description: "Platform or merchant where the expense occurred (e.g., Swiggy, Amazon)"
    },
    payment_method: {
      type: ["string", "null"],
      description: "Payment method used (e.g., Card, Cash, UPI)"
    },
    type: {
      type: "string",
      enum: ["EXPENSE", "INFLOW"],
      description: "Type of transaction"
    },
    tags: {
      type: "array",
      items: { type: "string" },
      description: "Tags associated with the expense (e.g., ['Kerala trip', 'chips'])"
    }
  },
  required: ["amount", "type"],
  additionalProperties: false
}
