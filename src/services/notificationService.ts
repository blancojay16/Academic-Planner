import { Capacitor } from '@capacitor/core';
import { LocalNotifications } from '@capacitor/local-notifications';
import { PushNotifications } from '@capacitor/push-notifications';
import { supabase } from '@/integrations/supabase/client';

export interface NotificationData {
  id: string;
  title: string;
  body: string;
  scheduledTime: Date;
  type: 'schedule' | 'note_deadline';
}

class NotificationService {
  private isInitialized = false;

  async initialize() {
    if (!Capacitor.isNativePlatform() || this.isInitialized) {
      return;
    }

    try {
      // Request permissions
      const { receive } = await PushNotifications.requestPermissions();
      
      if (receive === 'granted') {
        await PushNotifications.register();
        console.log('Push notifications registered successfully');

        // Register with APNs / FCM
        PushNotifications.addListener('registration', (token) => {
          console.log('Push registration success, token: ' + token.value);
        });

        PushNotifications.addListener('registrationError', (error) => {
          console.error('Error on registration: ' + JSON.stringify(error));
        });
      }

      // Request local notification permissions
      const localPerms = await LocalNotifications.requestPermissions();
      if (localPerms.display === 'granted') {
        console.log('Local notifications permissions granted');
      }

      this.isInitialized = true;
    } catch (error) {
      console.error('Error initializing notifications:', error);
    }
  }

  async scheduleUpcomingEventNotifications() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Get upcoming events (next 7 days)
      const now = new Date();
      const nextWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

      const { data: schedules, error } = await supabase
        .from('schedules')
        .select('*')
        .eq('user_id', user.id)
        .gte('start_time', now.toISOString())
        .lte('start_time', nextWeek.toISOString())
        .order('start_time', { ascending: true });

      if (error) {
        console.error('Error fetching schedules:', error);
        return;
      }

      // Clear existing scheduled notifications
      await this.clearScheduledNotifications();

      // Schedule notifications for each event
      const notifications = schedules?.map((schedule, index) => {
        const eventTime = new Date(schedule.start_time);
        const notificationTime = new Date(eventTime.getTime() - 15 * 60 * 1000); // 15 minutes before

        return {
          id: index + 1,
          title: `Upcoming: ${schedule.title}`,
          body: `Your ${schedule.category} starts in 15 minutes${schedule.location ? ` at ${schedule.location}` : ''}`,
          schedule: { at: notificationTime },
          actionTypeId: 'OPEN_APP',
          extra: {
            scheduleId: schedule.id,
            type: 'schedule'
          }
        };
      }).filter(notification => notification.schedule.at > now) || [];

      if (notifications.length > 0 && Capacitor.isNativePlatform()) {
        await LocalNotifications.schedule({ notifications });
        console.log(`Scheduled ${notifications.length} event notifications`);
      }

    } catch (error) {
      console.error('Error scheduling event notifications:', error);
    }
  }

  async scheduleNoteDeadlineNotifications() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Get notes with upcoming deadlines
      const now = new Date();
      const nextWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

      const { data: notes, error } = await supabase
        .from('notes')
        .select('*')
        .eq('user_id', user.id)
        .not('deadline', 'is', null)
        .gte('deadline', now.toISOString())
        .lte('deadline', nextWeek.toISOString())
        .order('deadline', { ascending: true });

      if (error) {
        console.error('Error fetching notes with deadlines:', error);
        return;
      }

      // Schedule notifications for note deadlines
      const deadlineNotifications = notes?.map((note, index) => {
        const deadlineTime = new Date(note.deadline);
        const notificationTime = new Date(deadlineTime.getTime() - 24 * 60 * 60 * 1000); // 1 day before

        return {
          id: index + 100, // Use different ID range for deadline notifications
          title: `Deadline Reminder: ${note.title}`,
          body: `Your note "${note.title}" has a deadline tomorrow`,
          schedule: { at: notificationTime },
          actionTypeId: 'OPEN_APP',
          extra: {
            noteId: note.id,
            type: 'note_deadline'
          }
        };
      }).filter(notification => notification.schedule.at > now) || [];

      if (deadlineNotifications.length > 0 && Capacitor.isNativePlatform()) {
        await LocalNotifications.schedule({ notifications: deadlineNotifications });
        console.log(`Scheduled ${deadlineNotifications.length} deadline notifications`);
      }

    } catch (error) {
      console.error('Error scheduling deadline notifications:', error);
    }
  }

  async clearScheduledNotifications() {
    if (Capacitor.isNativePlatform()) {
      try {
        const { notifications } = await LocalNotifications.getPending();
        if (notifications.length > 0) {
          const ids = notifications.map(n => n.id);
          await LocalNotifications.cancel({ notifications: ids.map(id => ({ id })) });
          console.log(`Cancelled ${ids.length} pending notifications`);
        }
      } catch (error) {
        console.error('Error clearing notifications:', error);
      }
    }
  }

  async refreshAllNotifications() {
    await this.scheduleUpcomingEventNotifications();
    await this.scheduleNoteDeadlineNotifications();
  }

  // Web fallback for development/testing
  showWebNotification(title: string, body: string) {
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(title, {
        body,
        icon: '/favicon.ico'
      });
    }
  }

  async requestWebNotificationPermission() {
    if ('Notification' in window && Notification.permission === 'default') {
      const permission = await Notification.requestPermission();
      return permission === 'granted';
    }
    return Notification.permission === 'granted';
  }
}

export const notificationService = new NotificationService();