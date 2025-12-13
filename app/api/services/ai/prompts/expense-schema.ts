// JSON Schemas for AI structured outputs

export const expenseSchema = {
  type: "object",
  properties: {
    amount: {
      type: ["number", "null"],
      description: "The monetary amount of the expense or income"
    },
    currency: {
      type: "string",
      description: "The currency code, defaults to INR if ambiguous"
    },
    type: {
      type: "string",
      enum: ["EXPENSE", "INFLOW"],
      description: "Type of transaction"
    }
  },
  required: ["amount", "currency", "type"],
  additionalProperties: true
}
