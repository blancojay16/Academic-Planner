import { useEffect } from 'react';
import { notificationService } from '@/services/notificationService';
import { supabase } from '@/integrations/supabase/client';

export const useNotifications = () => {
  useEffect(() => {
    const initializeNotifications = async () => {
      try {
        await notificationService.initialize();
        await notificationService.refreshAllNotifications();
      } catch (error) {
        console.error('Failed to initialize notifications:', error);
        // Don't block app startup if notifications fail
      }
    };

    initializeNotifications();

    // Set up real-time listeners for schedule and note changes
    const scheduleChannel = supabase
      .channel('schedule-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'schedules',
        },
        () => {
          // Refresh notifications when schedules change
          notificationService.scheduleUpcomingEventNotifications();
        }
      )
      .subscribe();

    const notesChannel = supabase
      .channel('notes-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'notes',
        },
        () => {
          // Refresh notifications when notes with deadlines change
          notificationService.scheduleNoteDeadlineNotifications();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(scheduleChannel);
      supabase.removeChannel(notesChannel);
    };
  }, []);

  return {
    refreshNotifications: () => notificationService.refreshAllNotifications(),
    requestWebPermission: () => notificationService.requestWebNotificationPermission(),
  };
};