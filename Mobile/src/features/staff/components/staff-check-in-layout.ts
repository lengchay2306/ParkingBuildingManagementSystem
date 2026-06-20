import { Radius } from '@/constants/design';

/**
 * Minimum body height for the vehicle/contact card (form input state).
 * Grows when the active-session conflict banner is shown.
 */
export const CHECKIN_VEHICLE_BODY_HEIGHT = 220;

/** Extra vertical space when the conflict banner includes a checkout link. */
export const CHECKIN_CONFLICT_BANNER_EXTRA_HEIGHT = 36;

/** Rounded clip for the inline scanner — matches input field corners. */
export const CHECKIN_CAMERA_BORDER_RADIUS = Radius.lg;

/** Symmetric inset for floating scanner controls. */
export const CHECKIN_CAMERA_OVERLAY_INSET = 10;
