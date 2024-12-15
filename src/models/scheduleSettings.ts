import mongoose, { Schema, Document } from 'mongoose';

export interface WorkingHours {
  day: number;  // 0-6, where 0 is Sunday
  isOpen: boolean;
  openTime: string;  // Format: "HH:mm"
  closeTime: string; // Format: "HH:mm"
}

export interface ScheduleSettings extends Document {
  salonId: string;
  workingHours: WorkingHours[];
  defaultAppointmentDuration: number; // in minutes
  bufferBetweenAppointments: number; // in minutes
  maxAdvanceBookingDays: number;
  minAdvanceBookingHours: number;
  createdAt: Date;
  updatedAt: Date;
}

const workingHoursSchema = new Schema({
  day: { type: Number, required: true, min: 0, max: 6 },
  isOpen: { type: Boolean, required: true },
  openTime: { type: String, required: true },
  closeTime: { type: String, required: true }
});

const scheduleSettingsSchema = new Schema({
  salonId: { type: Schema.Types.ObjectId, ref: 'Salon', required: true },
  workingHours: {
    type: [workingHoursSchema],
    required: true,
    validate: {
      validator: function(hours: WorkingHours[]) {
        // Ensure we have exactly 7 days
        if (hours.length !== 7) return false;
        // Ensure days are unique and in range 0-6
        const days = new Set(hours.map(h => h.day));
        return days.size === 7 && Array.from(days).every(d => d >= 0 && d <= 6);
      },
      message: 'Mora postojati tačno 7 dana sa jedinstvenim vrednostima od 0-6'
    }
  },
  defaultAppointmentDuration: {
    type: Number,
    required: true,
    min: 15,
    max: 240,
    default: 60
  },
  bufferBetweenAppointments: {
    type: Number,
    required: true,
    min: 0,
    max: 60,
    default: 15
  },
  maxAdvanceBookingDays: {
    type: Number,
    required: true,
    min: 1,
    max: 365,
    default: 30
  },
  minAdvanceBookingHours: {
    type: Number,
    required: true,
    min: 0,
    max: 48,
    default: 24
  }
}, {
  timestamps: true
});

export default mongoose.model<ScheduleSettings>('ScheduleSettings', scheduleSettingsSchema);
