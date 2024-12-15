import { Request, Response } from 'express';
import { startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth, format, addDays, addWeeks, addMonths, subDays, differenceInDays, isToday, isAfter, isSameDay } from 'date-fns';
import { sr } from 'date-fns/locale';
import prisma from '../lib/prisma';

function determineGrouping(start: Date, end: Date): 'day' | 'week' | 'month' {
  const daysDifference = differenceInDays(end, start);
  
  if (daysDifference <= 30) {
    return 'day';
  } else if (daysDifference <= 90) {
    return 'week';
  } else {
    return 'month';
  }
}

function processAppointmentsForChart(appointments: any[], start: Date, end: Date) {
  const groupBy = determineGrouping(start, end);
  const groupedData = new Map();
  
  // Initialize all periods with zero values
  let currentDate = new Date(start);
  while (currentDate <= end) {
    let dateKey;
    if (groupBy === 'day') {
      dateKey = format(currentDate, 'dd.MM.', { locale: sr });
      currentDate = addDays(currentDate, 1);
    } else if (groupBy === 'week') {
      const weekStart = startOfWeek(currentDate, { locale: sr });
      const weekEnd = endOfWeek(currentDate, { locale: sr });
      dateKey = `${format(weekStart, 'dd.MM.', { locale: sr })} - ${format(weekEnd, 'dd.MM.', { locale: sr })}`;
      currentDate = addWeeks(currentDate, 1);
    } else {
      dateKey = format(currentDate, 'MMMM yyyy', { locale: sr });
      currentDate = addMonths(currentDate, 1);
    }
    groupedData.set(dateKey, { turnover: 0, appointments: 0 });
  }

  // Add actual appointment data
  appointments.forEach((app) => {
    const appDate = new Date(app.startTime);
    let dateKey;
    
    if (groupBy === 'day') {
      dateKey = format(appDate, 'dd.MM.', { locale: sr });
    } else if (groupBy === 'week') {
      const weekStart = startOfWeek(appDate, { locale: sr });
      const weekEnd = endOfWeek(appDate, { locale: sr });
      dateKey = `${format(weekStart, 'dd.MM.', { locale: sr })} - ${format(weekEnd, 'dd.MM.', { locale: sr })}`;
    } else {
      dateKey = format(appDate, 'MMMM yyyy', { locale: sr });
    }

    // For future appointments, show expected revenue if not cancelled
    const isValidAppointment = !['CANCELLED', 'NO_SHOW', 'OTKAZANO', 'NIJE_DOŠAO'].includes(app.status.toUpperCase());
    
    const existing = groupedData.get(dateKey) || { turnover: 0, appointments: 0 };
    groupedData.set(dateKey, {
      turnover: existing.turnover + (isValidAppointment ? (app.price || 0) : 0),
      appointments: existing.appointments + 1,
    });
  });

  // Convert to array and sort by date
  return Array.from(groupedData, ([date, data]) => ({
    date,
    turnover: data.turnover,
    appointments: data.appointments,
  }));
}

export const getDashboardStats = async (req: Request, res: Response) => {
  try {
    const { startDate, endDate } = req.query;
    const start = startDate ? new Date(startDate as string) : subDays(startOfDay(new Date()), 30);
    const end = endDate ? new Date(endDate as string) : endOfDay(new Date());
    const user = req.user as any;

    console.log('Fetching dashboard stats for period:', { start, end });

    // Build the where clause based on user role
    const whereClause: any = {
      startTime: {
        gte: start,
        lte: end,
      }
    };

    // If user is a therapist, only show their appointments
    if (user.role === 'THERAPIST') {
      // First find the therapist by user's email since it's unique
      const therapist = await prisma.therapist.findUnique({
        where: { email: user.email }
      });
      
      if (!therapist) {
        return res.status(404).json({ message: 'Therapist not found' });
      }
      
      whereClause.therapistId = therapist.id;
    }

    // Get all appointments in the date range
    const appointments = await prisma.appointment.findMany({
      where: whereClause,
      include: {
        service: true,
        client: true,
        therapist: true
      }
    });

    // Calculate total turnover - for appointments in the period
    const totalTurnover = appointments
      .filter(app => 
        !['CANCELLED', 'NO_SHOW', 'OTKAZANO', 'NIJE_DOŠAO'].includes(app.status.toUpperCase())
      )
      .reduce((sum, appointment) => {
        return sum + (appointment.price || 0);
      }, 0);

    // Get appointments count for the period
    const periodAppointments = appointments.filter(app => 
      !['CANCELLED', 'NO_SHOW', 'OTKAZANO', 'NIJE_DOŠAO'].includes(app.status.toUpperCase())
    ).length;

    // Get active clients (clients with appointments in the period)
    const activeClients = new Set(appointments.map(app => app.client.id)).size;

    // Process appointments for chart data with appropriate grouping
    const chartData = processAppointmentsForChart(appointments, start, end);

    const stats = {
      periodAppointments,
      activeClients,
      totalTurnover,
      chartData
    };

    console.log('Returning dashboard stats:', stats);
    res.json(stats);
  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    res.status(500).json({ error: 'Internal server error', details: error.message });
  }
};
