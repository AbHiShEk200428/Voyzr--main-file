import { RequestHandler } from "express";

// Mock data
const mockTrips = [
  {
    id: "1",
    name: "Paris Summer Getaway",
    destination: "Paris, France",
    description:
      "Explore the City of Light with the best crew. Enjoy iconic landmarks, French cuisine, and unforgettable memories.",
    startDate: "2024-06-15",
    endDate: "2024-06-22",
    status: "Planning" as const,
    participantCount: 4,
    participants: [
      {
        id: "u1",
        name: "Alice Johnson",
        email: "alice@example.com",
        avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Alice",
      },
      {
        id: "u2",
        name: "Bob Smith",
        email: "bob@example.com",
        avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Bob",
      },
      {
        id: "u3",
        name: "Carol White",
        email: "carol@example.com",
        avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Carol",
      },
      {
        id: "u4",
        name: "David Brown",
        email: "david@example.com",
        avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=David",
      },
    ],
    createdBy: "u1",
    createdAt: "2024-01-10T10:00:00Z",
    updatedAt: "2024-01-15T14:30:00Z",
  },
  {
    id: "2",
    name: "Tokyo Adventure",
    destination: "Tokyo, Japan",
    description:
      "Experience modern Japan with traditional culture. Street food, temples, and neon-lit nights.",
    startDate: "2024-04-01",
    endDate: "2024-04-10",
    status: "Ongoing" as const,
    participantCount: 3,
    participants: [
      {
        id: "u1",
        name: "Alice Johnson",
        email: "alice@example.com",
        avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Alice",
      },
      {
        id: "u2",
        name: "Bob Smith",
        email: "bob@example.com",
        avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Bob",
      },
      {
        id: "u5",
        name: "Emma Davis",
        email: "emma@example.com",
        avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Emma",
      },
    ],
    createdBy: "u1",
    createdAt: "2024-01-05T09:00:00Z",
    updatedAt: "2024-03-28T16:45:00Z",
  },
  {
    id: "3",
    name: "New York City Trip",
    destination: "New York City, USA",
    description:
      "The city that never sleeps awaits. Broadway shows, amazing food, and incredible sights.",
    startDate: "2024-02-10",
    endDate: "2024-02-15",
    status: "Completed" as const,
    participantCount: 5,
    participants: [
      {
        id: "u1",
        name: "Alice Johnson",
        email: "alice@example.com",
        avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Alice",
      },
      {
        id: "u2",
        name: "Bob Smith",
        email: "bob@example.com",
        avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Bob",
      },
      {
        id: "u3",
        name: "Carol White",
        email: "carol@example.com",
        avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Carol",
      },
      {
        id: "u4",
        name: "David Brown",
        email: "david@example.com",
        avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=David",
      },
      {
        id: "u5",
        name: "Emma Davis",
        email: "emma@example.com",
        avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Emma",
      },
    ],
    createdBy: "u1",
    createdAt: "2023-12-20T11:00:00Z",
    updatedAt: "2024-02-15T18:00:00Z",
  },
];

export const getMyTrips: RequestHandler = (_req, res) => {
  res.json(mockTrips);
};

export const getTrip: RequestHandler = (req, res) => {
  const { id } = req.params;
  const trip = mockTrips.find((t) => t.id === id);

  if (!trip) {
    return res.status(404).json({ message: "Trip not found" });
  }

  res.json(trip);
};

export const createTrip: RequestHandler = (req, res) => {
  const { name, destination, description, startDate, endDate } = req.body;

  if (!name || !destination) {
    return res
      .status(400)
      .json({ message: "Name and destination are required" });
  }

  const newTrip = {
    id: String(mockTrips.length + 1),
    name,
    destination,
    description: description || "",
    startDate,
    endDate,
    status: "Planning" as const,
    participantCount: 1,
    participants: [
      {
        id: "u1",
        name: "You",
        email: "you@example.com",
        avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=You",
      },
    ],
    createdBy: "u1",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  mockTrips.push(newTrip);
  res.status(201).json(newTrip);
};

export const updateTrip: RequestHandler = (req, res) => {
  const { id } = req.params;
  const trip = mockTrips.find((t) => t.id === id);

  if (!trip) {
    return res.status(404).json({ message: "Trip not found" });
  }

  Object.assign(trip, {
    ...req.body,
    updatedAt: new Date().toISOString(),
  });

  res.json(trip);
};

export const deleteTrip: RequestHandler = (req, res) => {
  const { id } = req.params;
  const index = mockTrips.findIndex((t) => t.id === id);

  if (index === -1) {
    return res.status(404).json({ message: "Trip not found" });
  }

  const deletedTrip = mockTrips.splice(index, 1);
  res.json(deletedTrip[0]);
};
