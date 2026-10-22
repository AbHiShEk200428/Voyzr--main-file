import { RequestHandler } from "express";

const mockExpenses: Record<string, unknown[]> = {
  "1": [
    {
      id: "e1",
      tripId: "1",
      description: "Hotel in Paris",
      amount: 500,
      currency: "EUR",
      paidBy: {
        id: "u1",
        name: "Alice Johnson",
        email: "alice@example.com",
      },
      splitAmong: [
        { id: "u1", name: "Alice Johnson" },
        { id: "u2", name: "Bob Smith" },
        { id: "u3", name: "Carol White" },
        { id: "u4", name: "David Brown" },
      ],
      createdAt: "2024-01-15T10:00:00Z",
    },
  ],
  "2": [
    {
      id: "e2",
      tripId: "2",
      description: "Flight to Tokyo",
      amount: 1200,
      currency: "USD",
      paidBy: {
        id: "u2",
        name: "Bob Smith",
        email: "bob@example.com",
      },
      splitAmong: [
        { id: "u1", name: "Alice Johnson" },
        { id: "u2", name: "Bob Smith" },
        { id: "u5", name: "Emma Davis" },
      ],
      createdAt: "2024-03-20T15:00:00Z",
    },
  ],
};

export const getTripExpenses: RequestHandler = (req, res) => {
  const { tripId } = req.params as Record<string, string>;
  const expenses = mockExpenses[tripId] || [];
  res.json(expenses);
};

export const createExpense: RequestHandler = (req, res) => {
  const { tripId, description, amount, currency, paidBy, splitAmong } =
    req.body as Record<string, any>;

  if (!tripId || !description || !amount) {
    return res.status(400).json({
      message: "tripId, description, and amount are required",
    });
  }

  const newExpense = {
    id: `e${Date.now()}`,
    tripId,
    description,
    amount,
    currency: currency || "USD",
    paidBy,
    splitAmong,
    createdAt: new Date().toISOString(),
  };

  const currentTripId = tripId as string;
  if (!mockExpenses[currentTripId]) {
    mockExpenses[currentTripId] = [];
  }

  mockExpenses[currentTripId].push(newExpense);
  res.status(201).json(newExpense);
};

export const updateExpense: RequestHandler = (req, res) => {
  const { id } = req.params;

  for (const expenses of Object.values(mockExpenses)) {
    const expense = expenses.find((e: unknown) => (e as Record<string, unknown>).id === id);
    if (expense) {
      Object.assign(expense, req.body);
      return res.json(expense);
    }
  }

  res.status(404).json({ message: "Expense not found" });
};

export const deleteExpense: RequestHandler = (req, res) => {
  const { id } = req.params;

  for (const [tripId, expenses] of Object.entries(mockExpenses)) {
    const index = expenses.findIndex((e: unknown) => (e as Record<string, unknown>).id === id);
    if (index !== -1) {
      const deletedExpense = expenses.splice(index, 1);
      return res.json(deletedExpense[0]);
    }
  }

  res.status(404).json({ message: "Expense not found" });
};
