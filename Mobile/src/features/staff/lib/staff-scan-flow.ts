import { getActiveSessionByPlate, type ParkingSession } from '@/features/staff/api';
import { formatLicensePlateForApi } from '@/features/staff/lib/license-plate-ocr';

export type StaffScanFlowResult =
  | { kind: 'invalid_plate' }
  | { kind: 'checkout'; sessionId: string; plate: string; session: ParkingSession }
  | { kind: 'checkin'; plate: string };

export async function resolveStaffScanFlow(rawPlate: string): Promise<StaffScanFlowResult> {
  const plate = formatLicensePlateForApi(rawPlate);
  if (!plate) {
    return { kind: 'invalid_plate' };
  }

  const activeSession = await getActiveSessionByPlate(plate).catch(() => null);
  if (activeSession?._id) {
    return { kind: 'checkout', sessionId: activeSession._id, plate, session: activeSession };
  }

  return { kind: 'checkin', plate };
}
