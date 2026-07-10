import React, { createContext, useCallback, useContext, useMemo, useRef, useState } from "react";

import {
  checkoutParkingSession as checkoutParkingSessionApi,
  getParkingSessions,
  getParkingSlots,
  type ParkingSessionsQuery,
  type ParkingFloor,
  type ParkingSlotFilters,
} from "@/features/staff/api";
import {
  computeSlotStats,
  indexActiveSessionsBySlotId,
  mapParkingSessionToRecord,
  todayDateParam,
  type StaffCheckInRecord,
} from "@/features/staff/lib/utils";

type LoadSessionsOptions = Omit<ParkingSessionsQuery, "date"> & { date?: string };

type StaffWorkspaceContextValue = {
  floors: ParkingFloor[];
  isLoadingSlots: boolean;
  parkingSessions: StaffCheckInRecord[];
  activeSessionsBySlotId: Record<string, StaffCheckInRecord>;
  isLoadingSessions: boolean;
  sessionsError: string | null;
  todaySessionCount: number;
  slotStats: ReturnType<typeof computeSlotStats>;
  loadParkingSlots: (filters?: ParkingSlotFilters) => Promise<ParkingFloor[]>;
  loadParkingSessions: (
    options?: LoadSessionsOptions,
    floorSnapshot?: ParkingFloor[],
  ) => Promise<StaffCheckInRecord[]>;
  loadActiveSlotSessions: (
    floorSnapshot?: ParkingFloor[],
  ) => Promise<Record<string, StaffCheckInRecord>>;
  refreshWorkspace: (sessionOptions?: LoadSessionsOptions) => Promise<void>;
  checkoutSession: (sessionId: string, phone: string) => Promise<void>;
  recordCheckIn: (record: StaffCheckInRecord) => void;
};

const StaffWorkspaceContext = createContext<StaffWorkspaceContextValue | undefined>(undefined);

export function StaffWorkspaceProvider({ children }: { children: React.ReactNode }) {
  const [floors, setFloors] = useState<ParkingFloor[]>([]);
  const floorsRef = useRef(floors);
  floorsRef.current = floors;
  const [isLoadingSlots, setIsLoadingSlots] = useState(false);
  const [parkingSessions, setParkingSessions] = useState<StaffCheckInRecord[]>([]);
  const [activeSessionsBySlotId, setActiveSessionsBySlotId] = useState<
    Record<string, StaffCheckInRecord>
  >({});
  const [isLoadingSessions, setIsLoadingSessions] = useState(false);
  const [sessionsError, setSessionsError] = useState<string | null>(null);
  const [todaySessionCount, setTodaySessionCount] = useState(0);

  const slotStats = useMemo(() => computeSlotStats(floors), [floors]);

  const loadParkingSlots = useCallback(async (filters: ParkingSlotFilters = {}) => {
    if (floorsRef.current.length === 0) {
      setIsLoadingSlots(true);
    }
    try {
      const data = await getParkingSlots(filters);
      setFloors(data);
      return data;
    } finally {
      setIsLoadingSlots(false);
    }
  }, []);

  const loadParkingSessions = useCallback(
    async (options: LoadSessionsOptions = {}, floorSnapshot?: ParkingFloor[]) => {
      setIsLoadingSessions(true);
      setSessionsError(null);
      try {
        const date = options.date ?? todayDateParam();
        const { sessions, pagination } = await getParkingSessions({
          page: options.page ?? 1,
          limit: options.limit ?? 50,
          status: options.status,
          date,
        });

        let resolvedFloors = floorSnapshot ?? floorsRef.current;
        if (resolvedFloors.length === 0) {
          resolvedFloors = await getParkingSlots().catch(() => []);
          if (resolvedFloors.length > 0) {
            setFloors(resolvedFloors);
          }
        }

        const records = sessions.map((session) =>
          mapParkingSessionToRecord(session, resolvedFloors),
        );
        setParkingSessions(records);
        if (!options.status) {
          setTodaySessionCount(pagination.totalItems);
        }
        return records;
      } catch (error) {
        const message = error instanceof Error ? error.message : "Could not load sessions";
        setSessionsError(message);
        throw error;
      } finally {
        setIsLoadingSessions(false);
      }
    },
    [],
  );

  const loadActiveSlotSessions = useCallback(async (floorSnapshot?: ParkingFloor[]) => {
    try {
      const { sessions } = await getParkingSessions({
        page: 1,
        limit: 200,
        status: "ACTIVE",
        date: todayDateParam(),
      });

      let resolvedFloors = floorSnapshot ?? floorsRef.current;
      if (resolvedFloors.length === 0) {
        resolvedFloors = await getParkingSlots().catch(() => []);
        if (resolvedFloors.length > 0) {
          setFloors(resolvedFloors);
        }
      }

      const records = sessions.map((session) => mapParkingSessionToRecord(session, resolvedFloors));
      const bySlot = indexActiveSessionsBySlotId(records);
      setActiveSessionsBySlotId(bySlot);
      return bySlot;
    } catch {
      setActiveSessionsBySlotId({});
      return {};
    }
  }, []);

  const refreshWorkspace = useCallback(
    async (sessionOptions?: LoadSessionsOptions) => {
      const loadedFloors = await loadParkingSlots();
      await Promise.all([
        loadParkingSessions(sessionOptions, loadedFloors),
        loadActiveSlotSessions(loadedFloors),
      ]);
    },
    [loadParkingSessions, loadParkingSlots, loadActiveSlotSessions],
  );

  const checkoutSession = useCallback(
    async (sessionId: string, phone: string) => {
      await checkoutParkingSessionApi({ parkingSessionId: sessionId, phone });
      const loadedFloors = await loadParkingSlots();
      await Promise.all([
        loadParkingSessions({}, loadedFloors),
        loadActiveSlotSessions(loadedFloors),
      ]);
    },
    [loadParkingSessions, loadParkingSlots, loadActiveSlotSessions],
  );

  const recordCheckIn = useCallback((record: StaffCheckInRecord) => {
    setParkingSessions((prev) => {
      const next = [record, ...prev.filter((item) => item.id !== record.id)];
      return next.slice(0, 50);
    });
    if (record.slotId && record.status.toUpperCase() === "ACTIVE") {
      setActiveSessionsBySlotId((prev) => ({ ...prev, [record.slotId!]: record }));
    }
    setTodaySessionCount((count) => count + 1);
  }, []);

  const value = useMemo(
    () => ({
      floors,
      isLoadingSlots,
      parkingSessions,
      activeSessionsBySlotId,
      isLoadingSessions,
      sessionsError,
      todaySessionCount,
      slotStats,
      loadParkingSlots,
      loadParkingSessions,
      loadActiveSlotSessions,
      refreshWorkspace,
      checkoutSession,
      recordCheckIn,
    }),
    [
      floors,
      isLoadingSlots,
      parkingSessions,
      activeSessionsBySlotId,
      isLoadingSessions,
      sessionsError,
      todaySessionCount,
      slotStats,
      loadParkingSlots,
      loadParkingSessions,
      loadActiveSlotSessions,
      refreshWorkspace,
      checkoutSession,
      recordCheckIn,
    ],
  );

  return <StaffWorkspaceContext.Provider value={value}>{children}</StaffWorkspaceContext.Provider>;
}

export function useStaffWorkspace() {
  const context = useContext(StaffWorkspaceContext);
  if (!context) {
    throw new Error("useStaffWorkspace must be used within StaffWorkspaceProvider");
  }
  return context;
}
