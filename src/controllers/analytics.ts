import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { startOfDay, endOfDay, parseISO, format, differenceInDays, addDays, isBefore, isSameDay, addWeeks, startOfMonth, addMonths, isSameMonth, isWithinInterval } from 'date-fns';

const prisma = new PrismaClient();

interface AnalyticsFilter {
  type?: 'therapist' | 'service';
  value?: string;
}

export const getAnalytics = async (req: Request, res: Response) => {
  try {
    const { startDate, endDate } = req.query;
    const user = req.user as any;
    const filter: AnalyticsFilter = req.query;

    console.log('User requesting analytics:', { 
      email: user.email, 
      role: user.role,
      id: user.id
    });

    if (!user || !user.email) {
      console.error('No user or email found in request');
      return res.status(401).json({ message: 'User not authenticated' });
    }

    console.log('Received date range:', { startDate, endDate });
    
    const start = startOfDay(parseISO(startDate as string));
    const end = endOfDay(parseISO(endDate as string));
    console.log('Parsed date range:', { start, end });

    let therapistId: string | undefined;

    // If user is a therapist, get their ID
    if (user.role === 'THERAPIST') {
      console.log('User is a therapist, finding therapist record by email:', user.email);
      
      try {
        const therapist = await prisma.therapist.findUnique({
          where: { email: user.email }
        });
        
        console.log('Found therapist:', therapist);
        
        if (!therapist) {
          console.log('No therapist found for email:', user.email);
          return res.status(404).json({ message: 'Therapist not found' });
        }
        
        therapistId = therapist.id;
      } catch (error) {
        console.error('Error finding therapist:', error);
        return res.status(500).json({ message: 'Error finding therapist' });
      }
    }

    // Get all services first
    const services = await prisma.service.findMany({
      where: {
        isActive: true
      },
      select: {
        id: true,
        name: true
      }
    });

    // Get appointments in date range
    const appointments = await prisma.appointment.findMany({
      where: {
        startTime: {
          gte: start,
          lte: end,
        },
        status: {
          notIn: ['CANCELLED', 'NO_SHOW']
        },
        ...(filter.type === 'therapist' && filter.value && {
          therapistId: filter.value
        }),
        ...(filter.type === 'service' && filter.value && {
          serviceId: filter.value
        }),
        ...(therapistId && {
          therapistId
        })
      },
      include: {
        service: true,
        therapist: true,
        client: true,
      }
    });

    console.log('Found appointments:', appointments.length);

    // Calculate total revenue
    const totalRevenue = appointments.reduce((sum, apt) => {
      if (apt.status !== 'CANCELLED' && apt.status !== 'NO_SHOW') {
        return sum + (apt.price || 0);
      }
      return sum;
    }, 0);

    // Calculate total appointments
    const totalAppointments = appointments.length;

    // Get total number of clients
    const totalClientsWhereClause: any = {};
    if (therapistId) {
      totalClientsWhereClause.appointments = {
        some: {
          therapistId: therapistId
        }
      };
    }
    const totalClients = await prisma.client.count({
      where: totalClientsWhereClause
    });

    // Get new clients in period
    const newClients = await prisma.client.count({
      where: {
        createdAt: {
          gte: start,
          lte: end,
        }
      }
    });

    // Get revenue by service
    const revenueByService = await prisma.appointment.groupBy({
      by: ['serviceId'],
      where: {
        startTime: {
          gte: start,
          lte: end,
        },
        status: {
          notIn: ['CANCELLED', 'NO_SHOW']
        }
      },
      _sum: {
        price: true
      }
    });

    // First get all therapists
    const therapists = await prisma.therapist.findMany({
      where: {
        appointments: {
          some: {
            startTime: {
              gte: start,
              lte: end,
            },
            status: {
              notIn: ['CANCELLED', 'NO_SHOW']
            }
          }
        }
      },
      include: {
        appointments: {
          where: {
            startTime: {
              gte: start,
              lte: end,
            },
            status: {
              notIn: ['CANCELLED', 'NO_SHOW']
            }
          },
          include: {
            service: true
          }
        }
      }
    });

    console.log('Found therapists:', therapists.map(t => ({ 
      id: t.id, 
      name: t.name,
      appointmentCount: t.appointments.length 
    })));

    // Transform revenue by therapist data
    const therapistRevenueMap = new Map();
    
    // Initialize the map with therapist data
    therapists.forEach(therapist => {
      const revenueData: { 
        therapistId: string; 
        therapistName: string; 
        [key: string]: number | string 
      } = {
        therapistId: therapist.id,
        therapistName: therapist.name
      };

      // Initialize all services with 0 revenue
      services.forEach(service => {
        revenueData[service.name] = 0;
      });

      // Calculate revenue for each service
      therapist.appointments.forEach(apt => {
        if (apt.service) {
          revenueData[apt.service.name] = Number(revenueData[apt.service.name]) + Number(apt.price || 0);
        }
      });

      therapistRevenueMap.set(therapist.id, revenueData);
    });

    // Format revenue by therapist data
    const formattedRevenueByTherapist = Array.from(therapistRevenueMap.values())
      .map(therapistData => {
        // Create a new object with only non-zero revenue services
        const filteredRevenueData: any = {
          therapistId: therapistData.therapistId,
          therapistName: therapistData.therapistName
        };
        
        // Add only services with non-zero revenue
        Object.entries(therapistData).forEach(([key, value]) => {
          if (key !== 'therapistId' && key !== 'therapistName' && typeof value === 'number' && value > 0) {
            filteredRevenueData[key] = value;
          }
        });
        
        return filteredRevenueData;
      })
      .filter(therapist => {
        // Only include therapists who have any revenue
        const totalRevenue = Object.values(therapist)
          .filter(value => typeof value === 'number')
          .reduce((sum, value) => sum + value, 0);
        return totalRevenue > 0;
      })
      .sort((a, b) => {
        // Sort by total revenue
        const totalA = Object.values(a)
          .filter(value => typeof value === 'number')
          .reduce((sum, value) => sum + value, 0);
        const totalB = Object.values(b)
          .filter(value => typeof value === 'number')
          .reduce((sum, value) => sum + value, 0);
        return totalB - totalA;
      });

    console.log('Therapist revenue data:', formattedRevenueByTherapist);

    // Format service distribution data
    const serviceDistribution = services.map(service => {
      const revenue = appointments
        .filter(apt => apt.service?.id === service.id)
        .reduce((sum, apt) => sum + (apt.price || 0), 0);
      const count = appointments.filter(apt => apt.service?.id === service.id).length;
      return {
        serviceId: service.id,
        serviceName: service.name,
        revenue,
        _count: count
      };
    }).filter(service => service.revenue > 0);

    // Helper function to generate all dates in range
    const generateDatePoints = (start: Date, end: Date): string[] => {
      const dates: string[] = [];
      const daysDiff = differenceInDays(end, start);
      
      if (daysDiff <= 30) {
        // Daily points for up to 30 days
        for (let i = 0; i <= daysDiff; i++) {
          dates.push(format(addDays(start, i), 'yyyy-MM-dd'));
        }
      } else if (daysDiff <= 90) {
        // Weekly points for 30-90 days
        let current = start;
        while (isBefore(current, end) || isSameDay(current, end)) {
          dates.push(format(current, 'yyyy-MM-dd'));
          current = addWeeks(current, 1);
        }
      } else {
        // Monthly points for > 90 days
        let current = startOfMonth(start);
        while (isBefore(current, end)) {
          dates.push(format(current, 'yyyy-MM-dd'));
          current = addMonths(current, 1);
        }
        // Add the last month if not already included
        if (isSameMonth(current, end)) {
          dates.push(format(current, 'yyyy-MM-dd'));
        }
      }
      return dates;
    };

    // Calculate revenue trend with all data points
    const datePoints = generateDatePoints(start, end);
    const revenueTrend = datePoints.map(date => {
      const dayStart = startOfDay(parseISO(date));
      const dayEnd = endOfDay(parseISO(date));
      
      const dayAppointments = appointments.filter(apt => 
        isWithinInterval(apt.startTime, { start: dayStart, end: dayEnd }) &&
        apt.status !== 'CANCELLED' && 
        apt.status !== 'NO_SHOW'
      );

      return {
        date,
        revenue: dayAppointments.reduce((sum, apt) => sum + (apt.price || 0), 0),
        appointments: dayAppointments.length
      };
    });

    console.log('Formatted revenue data:', {
      revenueByTherapist: formattedRevenueByTherapist,
      serviceDistribution,
      revenueTrend
    });

    // Get previous period data
    const periodLength = end.getTime() - start.getTime();
    const previousStart = new Date(start.getTime() - periodLength);
    const previousEnd = new Date(end.getTime() - periodLength);

    const previousPeriodData = {
      totalRevenue: await prisma.appointment.aggregate({
        where: {
          startTime: {
            gte: previousStart,
            lte: previousEnd,
          },
          status: {
            notIn: ['CANCELLED', 'NO_SHOW']
          }
        },
        _sum: {
          price: true
        }
      }),
      totalAppointments: await prisma.appointment.count({
        where: {
          startTime: {
            gte: previousStart,
            lte: previousEnd,
          }
        }
      }),
      newClients: await prisma.client.count({
        where: {
          createdAt: {
            gte: previousStart,
            lte: previousEnd,
          }
        }
      })
    };

    return res.json({
      currentPeriod: {
        totalRevenue,
        totalAppointments,
        newClients,
        totalClients,
        revenueByService: revenueByService.map(rev => ({
          serviceId: rev.serviceId,
          serviceName: services.find(s => s.id === rev.serviceId)?.name,
          revenue: rev._sum.price || 0
        })),
        revenueByTherapist: formattedRevenueByTherapist,
        revenueTrend,
        serviceDistribution,
        services: services.map(s => ({
          id: s.id,
          name: s.name
        }))
      },
      previousPeriod: previousPeriodData
    });

  } catch (error) {
    console.error('Analytics error:', error);
    res.status(500).json({ error: 'Failed to fetch analytics data' });
  }
};
