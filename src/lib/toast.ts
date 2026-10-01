// One toast API for the whole app — every action that saves, deletes or changes something
// reports through this, so the feedback looks and behaves the same everywhere.
import { toast as sonnerToast } from "sonner";

export const toast = {
  success: (message: string) => sonnerToast.success(message),
  error: (message: string) => sonnerToast.error(message),
  info: (message: string) => sonnerToast(message),
};
