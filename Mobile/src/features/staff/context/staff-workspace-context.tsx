import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';

import { getParkingSlots, type ParkingFloor } from '@/features/staff/api';
import { computeSlotStats, type StaffCheckInRecord } from '@/features/staff/lib/utils';

type StaffWorkspaceContextValue = {
  floors: ParkingFloor[];
  isLoadingSlots: boolean;
  slotStats: ReturnType<typeof computeSlotStats>;
  recentCheckIns: StaffCheckInRecord[];
  loadParkingSlots: () => Promise<ParkingFloor[]>;
  recordCheckIn: (record: StaffCheckInRecord) => void;
};

const StaffWorkspaceContext = createContext<StaffWorkspaceContextValue | undefined>(undefined);

export function StaffWorkspaceProvider({ children }: { children: React.ReactNode }) {
  const [floors, setFloors] = useState<ParkingFloor[]>([]);
  const [isLoadingSlots, setIsLoadingSlots] = useState(false);
  const [recentCheckIns, setRecentCheckIns] = useState<StaffCheckInRecord[]>([]);

  const slotStats = useMemo(() => computeSlotStats(floors), [floors]);

  const loadParkingSlots = useCallback(async () => {
    setIsLoadingSlots(true);
    try {
      const data = await getParkingSlots();
      setFloors(data);
      return data;
    } finally {
      setIsLoadingSlots(false);
    }
  }, []);

  const recordCheckIn = useCallback((record: StaffCheckInRecord) => {
    setRecentCheckIns((prev) => [record, ...prev.slice(0, 9)]);
  }, []);

  const value = useMemo(
    () => ({
      floors,
      isLoadingSlots,
      slotStats,
      recentCheckIns,
      loadParkingSlots,
      recordCheckIn,
    }),
    [floors, isLoadingSlots, slotStats, recentCheckIns, loadParkingSlots, recordCheckIn],
  );

  return (
    <StaffWorkspaceContext.Provider value={value}>{children}</StaffWorkspaceContext.Provider>
  );
}

export function useStaffWorkspace() {
  const context = useContext(StaffWorkspaceContext);
  if (!context) {
    throw new Error('useStaffWorkspace must be used within StaffWorkspaceProvider');
  }
  return context;
}
