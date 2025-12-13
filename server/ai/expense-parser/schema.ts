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
      description: "The currency code, defaults to INR if ambiguous"
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
    event: {
      type: ["string", "null"],
      description: "Event or trip associated with the expense (e.g., Kerala trip)"
    },
    notes: {
      type: ["string", "null"],
      description: "Additional notes or description of the expense"
    }
  },
  required: ["amount", "currency", "type"],
  additionalProperties: false
}
