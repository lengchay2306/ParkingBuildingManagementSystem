import { Radius } from '@/constants/design';

/**
 * Fixed body height for the vehicle/contact card (form input state).
 * label(14)+gap(6)+plate(52) + gap(12) + banner(52) + gap(12) + label(14)+gap(6)+phone(52) = 220
 */
export const CHECKIN_VEHICLE_BODY_HEIGHT = 220;

/** Rounded clip for the inline scanner — matches input field corners. */
export const CHECKIN_CAMERA_BORDER_RADIUS = Radius.lg;

/** Symmetric inset for floating scanner controls. */
export const CHECKIN_CAMERA_OVERLAY_INSET = 10;
