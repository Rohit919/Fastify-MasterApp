import { toast } from 'sonner';

/**
 * Single notification entry point. Features call notify.success/error/etc.
 * rather than importing sonner directly, so the toast library stays swappable
 * and messaging is consistent.
 */
export const notify = {
  success: (message: string, description?: string) => toast.success(message, { description }),
  error: (message: string, description?: string) => toast.error(message, { description }),
  info: (message: string, description?: string) => toast.info(message, { description }),
  warning: (message: string, description?: string) => toast.warning(message, { description }),
  message: (message: string, description?: string) => toast(message, { description }),
};
