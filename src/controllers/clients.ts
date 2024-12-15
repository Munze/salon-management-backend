import { Request, Response } from 'express';
import { validationResult } from 'express-validator';
import prisma from '../lib/prisma';
import { format } from 'date-fns';
import { startOfDay, endOfDay, startOfWeek, startOfMonth, endOfMonth, subMonths, startOfYear } from 'date-fns';

// Get all clients
export const getClients = async (req: Request, res: Response) => {
  try {
    const clients = await prisma.client.findMany({
      orderBy: {
        name: 'asc'
      }
    });
    res.json(clients);
  } catch (error) {
    console.error('Error getting clients:', error);
    res.status(500).json({ message: 'Error getting clients' });
  }
};

// Get single client
export const getClient = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const client = await prisma.client.findUnique({
      where: { id },
      include: {
        appointments: {
          include: {
            service: true,
            therapist: true
          }
        }
      }
    });

    if (!client) {
      return res.status(404).json({ message: 'Client not found' });
    }

    res.json(client);
  } catch (error) {
    console.error('Error getting client:', error);
    res.status(500).json({ message: 'Error getting client' });
  }
};

// Create new client
export const createClient = async (req: Request, res: Response) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const { name, phone, email, notes } = req.body;

    // Check if client with email already exists (if email provided)
    if (email) {
      const existingClient = await prisma.client.findUnique({
        where: { email }
      });

      if (existingClient) {
        return res.status(400).json({ message: 'Client with this email already exists' });
      }
    }

    const client = await prisma.client.create({
      data: {
        name,
        phone,
        email,
        notes
      }
    });
    res.status(201).json(client);
  } catch (error) {
    console.error('Error creating client:', error);
    res.status(500).json({ message: 'Error creating client' });
  }
};

// Update client
export const updateClient = async (req: Request, res: Response) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const { id } = req.params;
    const { name, phone, email, notes } = req.body;

    // Check if client exists
    const existingClient = await prisma.client.findUnique({
      where: { id }
    });

    if (!existingClient) {
      return res.status(404).json({ message: 'Client not found' });
    }

    // Check if email is being changed and if it's already taken
    if (email && email !== existingClient.email) {
      const emailTaken = await prisma.client.findUnique({
        where: { email }
      });

      if (emailTaken) {
        return res.status(400).json({ message: 'Email already taken' });
      }
    }

    const client = await prisma.client.update({
      where: { id },
      data: {
        name,
        phone,
        email,
        notes
      }
    });
    res.json(client);
  } catch (error) {
    console.error('Error updating client:', error);
    res.status(500).json({ message: 'Error updating client' });
  }
};

// Delete client
export const deleteClient = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // Check if client exists
    const existingClient = await prisma.client.findUnique({
      where: { id }
    });

    if (!existingClient) {
      return res.status(404).json({ message: 'Client not found' });
    }

    // Check for related appointments
    const appointments = await prisma.appointment.findMany({
      where: { clientId: id }
    });

    if (appointments.length > 0) {
      return res.status(400).json({ 
        message: 'Cannot delete client with existing appointments. Please delete all appointments first.' 
      });
    }

    await prisma.client.delete({
      where: { id }
    });
    res.status(204).send();
  } catch (error) {
    console.error('Error deleting client:', error);
    res.status(500).json({ message: 'Error deleting client' });
  }
};

// Get client history
export const getClientHistory = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { timeframe = 'thisMonth' } = req.query;
    console.log('Getting client history:', { id, timeframe });

    const client = await prisma.client.findUnique({
      where: { id },
      include: {
        appointments: {
          include: {
            service: true,
            therapist: true
          }
        }
      }
    });

    if (!client) {
      return res.status(404).json({ message: 'Client not found' });
    }

    // Get the date range based on timeframe
    const { startDate, endDate } = getDateRangeForTimeframe(timeframe as string);
    console.log('Date range:', { startDate, endDate });

    // Get appointments within the date range
    const appointments = await prisma.appointment.findMany({
      where: {
        clientId: id,
        startTime: {
          gte: startDate,
          lte: endDate
        }
      },
      include: {
        service: true,
        therapist: true
      },
      orderBy: {
        startTime: 'desc'
      }
    });

    console.log('Found appointments:', appointments.length);

    // Calculate statistics
    const stats = {
      totalAppointments: appointments.length,
      totalTurnover: appointments.reduce((sum, apt) => sum + apt.price, 0),
      periodLabel: getPeriodLabel(timeframe as string)
    };

    // Group appointments by month for history
    const history = appointments.reduce((acc: any, apt) => {
      const month = format(new Date(apt.startTime), 'MMMM yyyy');
      if (!acc[month]) {
        acc[month] = {
          appointmentCount: 0,
          totalTurnover: 0
        };
      }
      acc[month].appointmentCount++;
      acc[month].totalTurnover += apt.price;
      return acc;
    }, {});

    const response = {
      appointments: appointments.map(apt => ({
        id: apt.id,
        date: format(new Date(apt.startTime), 'dd.MM.yyyy'),
        time: format(new Date(apt.startTime), 'HH:mm'),
        service: apt.service?.name || 'Unknown Service',
        therapist: apt.therapist?.name || 'Unknown Therapist',
        status: apt.status,
        price: apt.price,
        notes: apt.notes || ''
      })),
      history,
      stats
    };

    console.log('Sending response:', response);
    res.json(response);
  } catch (error) {
    console.error('Error getting client history:', error);
    res.status(500).json({ message: 'Error getting client history' });
  }
};

const getDateRangeForTimeframe = (timeframe: string) => {
  const now = new Date();
  let startDate: Date;
  let endDate: Date;

  switch (timeframe) {
    case 'today':
      startDate = startOfDay(now);
      endDate = endOfDay(now);
      break;
    case 'thisWeek':
      startDate = startOfWeek(now, { weekStartsOn: 1 });
      endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
      break;
    case 'thisMonth':
      startDate = startOfMonth(now);
      endDate = new Date(now.getFullYear(), now.getMonth() + 1, 31, 23, 59, 59, 999);
      break;
    case 'lastMonth':
      startDate = startOfMonth(subMonths(now, 1));
      endDate = endOfMonth(subMonths(now, 1));
      break;
    case 'last3Months':
      startDate = startOfMonth(subMonths(now, 3));
      endDate = new Date(now.getFullYear(), now.getMonth() + 1, 31, 23, 59, 59, 999);
      break;
    case 'thisYear':
      startDate = startOfYear(now);
      endDate = new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999);
      break;
    default:
      startDate = startOfMonth(now);
      endDate = new Date(now.getFullYear(), now.getMonth() + 1, 31, 23, 59, 59, 999);
  }

  return { startDate, endDate };
};

const getPeriodLabel = (timeframe: string): string => {
  switch (timeframe) {
    case 'today':
      return 'danas';
    case 'thisWeek':
      return 'ove nedelje';
    case 'thisMonth':
      return 'ovog meseca';
    case 'lastMonth':
      return 'prošlog meseca';
    case 'last3Months':
      return 'poslednja 3 meseca';
    case 'thisYear':
      return 'ove godine';
    default:
      return 'ovog meseca';
  }
};
