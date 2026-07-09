import { useEffect, useMemo, useRef, useState, type ComponentPropsWithoutRef, type FormEvent } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { LucideIcon } from "lucide-react";
import {
  CarFront,
  CheckCircle2,
  ChevronDown,
  CircleDashed,
  Clock3,
  LoaderCircle,
  Mail,
  MapPin,
  Pencil,
  Phone,
  Plus,
  RefreshCw,
  Save,
  Trash2,
  UserRound,
} from "lucide-react";
import { toast } from "sonner";

import { SiteHeader } from "@/components/SiteHeader";
import { DriverChatbotWidget } from "@/components/chatbot/DriverChatbotWidget";
import { ReservationDetailDialog } from "@/components/ReservationDetailDialog";
import {
  DashboardEmptyState,
  DashboardLegend,
  DashboardMain,
  DashboardSection,
  DashboardSectionHeader,
} from "@/components/dashboard-ui";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { getVehicleReserveBlockReason } from "@/lib/parking-validation";
import { requireRole } from "@/lib/auth";
import {
  fetchParkingSessionsForVehicleIds,
  getParkingFloors,
  getParkingSessionSlotId,
  getReservationVehicleId,
  type ParkingFloor,
  type ParkingSession,
  type ParkingSlot,
  type ParkingSlotStatus,
} from "@/services/parking.service";
import {
  cancelReservation,
  createReservation,
  getMyReservations,
  getReservationSlotId,
  type Reservation,
} from "@/services/reservation.service";
import {
  createVehicle,
  getMyVehicles,
  getVehicleTypes,
  softDeleteMyVehicle,
  updateMyVehicle,
  type Vehicle,
  type VehicleType,
} from "@/services/vehicle.service";
import { getMyProfile, updateMyProfile, type UserProfile } from "@/services/user.service";

export const Route = createFileRoute("/driver")({
  beforeLoad: async () => {
    await requireRole("CUSTOMER");
  },
  head: () => ({
    meta: [
      { title: "Cổng tài xế - PARKOS" },
      {
        name: "description",
        content:
          "Cổng tài xế để xem thông tin đỗ xe, đặt chỗ, theo dõi phiên đỗ xe, thanh toán và gửi phản hồi.",
      },
      { property: "og:title", content: "Cổng tài xế - PARKOS" },
      {
        property: "og:description",
        content:
          "Xem tình trạng đỗ xe theo thời gian thực, đặt chỗ, theo dõi phiên đỗ xe và báo cáo sự cố.",
      },
    ],
  }),
  component: DriverPage,
});

type QuickAction = {
  id: "reserve" | "my-reservations";
  title: string;
  icon: LucideIcon;
  highlighted?: boolean;
};

const quickActions: QuickAction[] = [
  {
    id: "reserve",
    title: "Đặt chỗ đỗ xe",
    icon: MapPin,
    highlighted: true,
  },
  {
    id: "my-reservations",
    title: "Đặt chỗ của tôi",
    icon: Clock3,
  },
];

const reservedByYouButtonStyle =
  "border-status-yours/50 bg-status-yours/15 text-status-yours";
const reservedByYouBadgeStyle =
  "border-status-yours/45 bg-status-yours/15 text-status-yours";

const slotStatusText: Record<ParkingSlotStatus, string> = {
  AVAILABLE: "Trống",
  RESERVED: "Đã đặt",
  UNAVAILABLE: "Không khả dụng",
  "CURRENTLY-IN-USED": "Đang sử dụng",
};

const slotStatusBadge: Record<ParkingSlotStatus, string> = {
  AVAILABLE: "bg-status-empty/20 text-status-empty border-status-empty/40",
  RESERVED: "bg-status-reserved/15 text-status-reserved border-status-reserved/45",
  UNAVAILABLE: "bg-muted text-muted-foreground border-border",
  "CURRENTLY-IN-USED": "bg-status-full/20 text-status-full border-status-full/45",
};

const slotButtonStyles: Record<ParkingSlotStatus, string> = {
  AVAILABLE:
    "border-status-empty/50 bg-status-empty/15 text-status-empty hover:border-status-empty hover:bg-status-empty/20",
  RESERVED:
    "cursor-not-allowed border-status-reserved/50 bg-status-reserved/15 text-status-reserved opacity-70",
  UNAVAILABLE: "cursor-not-allowed border-border bg-secondary text-muted-foreground",
  "CURRENTLY-IN-USED":
    "cursor-not-allowed border-status-full/50 bg-status-full/15 text-status-full",
};

const vehicleTypesQueryKey = ["vehicle-types"] as const;
const myVehiclesQueryKey = ["my-vehicles"] as const;
const myProfileQueryKey = ["my-profile"] as const;
const parkingFloorsQueryKey = ["parking-floors"] as const;
const myReservationsQueryKey = ["my-reservations"] as const;
const myVehicleParkingSessionsQueryKey = ["my-vehicle-parking-sessions"] as const;
const emptyVehicleTypes: VehicleType[] = [];
const emptyVehicles: Vehicle[] = [];
const emptyParkingFloors: ParkingFloor[] = [];
const emptyParkingSlots: ParkingSlot[] = [];
const emptyReservations: Reservation[] = [];

function DriverPage() {
  const queryClient = useQueryClient();
  const [hasMounted, setHasMounted] = useState(false);
  const [selectedSpotId, setSelectedSpotId] = useState<string | null>(null);
  const [selectedFloorId, setSelectedFloorId] = useState<string>("");
  const [selectedReservationVehicleId, setSelectedReservationVehicleId] = useState<string>("");
  const [activeQuickAction, setActiveQuickAction] = useState<QuickAction["id"] | null>(null);
  const [licensePlate, setLicensePlate] = useState("");
  const [vehicleTypeId, setVehicleTypeId] = useState("");
  const [vehicleFormError, setVehicleFormError] = useState<string | null>(null);
  const [isVehicleFormOpen, setIsVehicleFormOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isEditProfileOpen, setIsEditProfileOpen] = useState(false);
  const [editFullName, setEditFullName] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editProfileError, setEditProfileError] = useState<string | null>(null);
  const [isEditVehicleOpen, setIsEditVehicleOpen] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState<Vehicle | null>(null);
  const [editVehicleLicensePlate, setEditVehicleLicensePlate] = useState("");
  const [editVehicleTypeId, setEditVehicleTypeId] = useState("");
  const [editVehicleError, setEditVehicleError] = useState<string | null>(null);
  const [deletingVehicleId, setDeletingVehicleId] = useState<string | null>(null);
  const [isVehiclesExpanded, setIsVehiclesExpanded] = useState(false);
  const [reservationHistoryDate, setReservationHistoryDate] = useState(() => getLocalDateInputValue());
  const [viewingHistoryReservation, setViewingHistoryReservation] = useState<Reservation | null>(null);
  const [expectedArrivalDate, setExpectedArrivalDate] = useState(getDefaultExpectedArrivalDate);
  const [expectedArrivalTime, setExpectedArrivalTime] = useState(getDefaultExpectedArrivalTime);
  const minExpectedArrivalTime =
    expectedArrivalDate === getLocalDateInputValue()
      ? toLocalTimeInputValue(Date.now() + 60_000)
      : undefined;
  const reserveSectionRef = useRef<HTMLDivElement | null>(null);
  const reservationSectionRef = useRef<HTMLElement | null>(null);
  const vehiclesSectionRef = useRef<HTMLElement | null>(null);
  useEffect(() => {
    setHasMounted(true);
  }, []);

  useEffect(() => {
    const node = vehiclesSectionRef.current;
    if (!node) {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        const [entry] = entries;
        if (entry?.isIntersecting) {
          setIsVehiclesExpanded(true);
        }
      },
      { threshold: 0.2 },
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  const profileQuery = useQuery({
    queryKey: myProfileQueryKey,
    queryFn: getMyProfile,
    enabled: hasMounted,
    staleTime: 0,
    refetchOnWindowFocus: true,
  });
  const vehicleTypesQuery = useQuery({
    queryKey: vehicleTypesQueryKey,
    queryFn: getVehicleTypes,
    enabled: hasMounted,
  });
  const vehiclesQuery = useQuery({
    queryKey: myVehiclesQueryKey,
    queryFn: getMyVehicles,
    enabled: hasMounted,
  });
  const parkingFloorsQuery = useQuery({
    queryKey: parkingFloorsQueryKey,
    queryFn: () => getParkingFloors(),
    enabled: hasMounted,
  });
  const myReservationsQuery = useQuery({
    queryKey: myReservationsQueryKey,
    queryFn: () => getMyReservations(),
    enabled: hasMounted,
  });

  const activeVehicleIds = useMemo(
    () =>
      (vehiclesQuery.data ?? [])
        .filter((vehicle) => vehicle.status !== "INACTIVE")
        .map((vehicle) => vehicle._id),
    [vehiclesQuery.data],
  );

  const vehicleParkingSessionsQuery = useQuery({
    queryKey: [...myVehicleParkingSessionsQueryKey, activeVehicleIds] as const,
    queryFn: () => fetchParkingSessionsForVehicleIds(activeVehicleIds),
    enabled: hasMounted && activeVehicleIds.length > 0,
  });

  const createVehicleMutation = useMutation({
    mutationFn: createVehicle,
    onSuccess: async (vehicle) => {
      setLicensePlate("");
      setVehicleFormError(null);
      setIsVehicleFormOpen(false);
      toast.success("Đăng ký xe thành công", {
        description: `${vehicle.licensePlate} đã được thêm vào tài khoản của bạn.`,
      });
      await queryClient.invalidateQueries({ queryKey: myVehiclesQueryKey });
    },
    onError: (error) => {
      setVehicleFormError(getErrorMessage(error, "Không thể đăng ký xe."));
    },
  });
  const updateVehicleMutation = useMutation({
    mutationFn: ({
      vehicleId,
      payload,
    }: {
      vehicleId: string;
      payload: { licensePlate?: string; vehicleTypeId?: string };
    }) => updateMyVehicle(vehicleId, payload),
    onSuccess: async (updatedVehicle) => {
      setEditVehicleError(null);
      setIsEditVehicleOpen(false);
      setEditingVehicle(null);
      setEditVehicleLicensePlate("");
      setEditVehicleTypeId("");
      toast.success("Cập nhật xe thành công", {
        description: `${updatedVehicle.licensePlate} đã được cập nhật.`,
      });
      await queryClient.invalidateQueries({ queryKey: myVehiclesQueryKey });
    },
    onError: (error) => {
      setEditVehicleError(getErrorMessage(error, "Không thể cập nhật xe."));
    },
  });
  const deleteVehicleMutation = useMutation({
    mutationFn: softDeleteMyVehicle,
    onSuccess: async (deletedVehicle) => {
      setDeletingVehicleId(null);
      toast.success("Đã xóa xe", {
        description: `${deletedVehicle.licensePlate} đã chuyển sang trạng thái INACTIVE.`,
      });
      await queryClient.invalidateQueries({ queryKey: myVehiclesQueryKey });
    },
    onError: (error) => {
      setDeletingVehicleId(null);
      toast.error("Không thể xóa xe", {
        description: getErrorMessage(error, "Vui lòng thử lại."),
      });
    },
  });
  const updateProfileMutation = useMutation({
    mutationFn: updateMyProfile,
    onSuccess: async (updatedUser) => {
      setEditProfileError(null);
      setIsEditProfileOpen(false);
      queryClient.setQueryData(myProfileQueryKey, updatedUser);
      await queryClient.invalidateQueries({ queryKey: myProfileQueryKey });
      toast.success("Cập nhật thành công", {
        description: "Thông tin hồ sơ của bạn đã được cập nhật.",
      });
    },
    onError: (error) => {
      const message = getErrorMessage(error, "Không thể cập nhật hồ sơ.");
      setEditProfileError(message);
      toast.error("Cập nhật thất bại", { description: message });
    },
  });
  const reserveSlotMutation = useMutation({
    mutationFn: createReservation,
    onSuccess: async (reservation) => {
      const reservationSlotId = getReservationSlotId(reservation);
      const reservedSlotLabel =
        reservationSlotId && floorSlots.some((slot) => slot._id === reservationSlotId)
          ? floorSlots.find((slot) => slot._id === reservationSlotId)?.slotNumber
          : selectedSpot?.slotNumber;
      toast.success("Đặt chỗ thành công", {
        description: `${reservedSlotLabel ?? "Chỗ đã chọn"} đã được đặt thành công.`,
      });
      setSelectedSpotId(null);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: myReservationsQueryKey }),
        queryClient.invalidateQueries({ queryKey: parkingFloorsQueryKey }),
      ]);
    },
    onError: (error) => {
      toast.error("Không thể đặt chỗ", {
        description: getErrorMessage(error, "Vui lòng kiểm tra dữ liệu và thử lại."),
      });
    },
  });
  const cancelReservationMutation = useMutation({
    mutationFn: cancelReservation,
    onSuccess: async () => {
      toast.success("Đã hủy đặt chỗ", {
        description: "Đặt chỗ đã chọn đã được hủy.",
      });
      setSelectedSpotId(null);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: myReservationsQueryKey }),
        queryClient.invalidateQueries({ queryKey: parkingFloorsQueryKey }),
      ]);
    },
    onError: (error) => {
      toast.error("Không thể hủy đặt chỗ", {
        description: getErrorMessage(error, "Vui lòng thử lại."),
      });
    },
  });

  const parkingFloors = parkingFloorsQuery.data ?? emptyParkingFloors;
  const selectedFloor = useMemo(() => {
    if (parkingFloors.length === 0) {
      return null;
    }
    return parkingFloors.find((floor) => floor._id === selectedFloorId) ?? parkingFloors[0] ?? null;
  }, [parkingFloors, selectedFloorId]);
  const floorSlots = selectedFloor?.slots ?? emptyParkingSlots;
  const selectedSpot = useMemo(
    () => floorSlots.find((slot) => slot._id === selectedSpotId) ?? null,
    [floorSlots, selectedSpotId],
  );
  const vehicleTypes = vehicleTypesQuery.data ?? emptyVehicleTypes;
  const vehicles = vehiclesQuery.data ?? emptyVehicles;
  const activeVehicles = useMemo(
    () => vehicles.filter((vehicle) => vehicle.status !== "INACTIVE"),
    [vehicles],
  );
  const reservations = myReservationsQuery.data ?? emptyReservations;
  const sessionsByVehicleId = vehicleParkingSessionsQuery.data ?? new Map<string, ParkingSession>();
  const vehicleParkingSessions = useMemo(
    () => Array.from(sessionsByVehicleId.values()),
    [sessionsByVehicleId],
  );
  const filteredHistoryReservations = useMemo(
    () =>
      reservations.filter((reservation) =>
        reservationMatchesDateFilter(reservation, reservationHistoryDate),
      ),
    [reservations, reservationHistoryDate],
  );
  const myPendingReservations = reservations.filter(
    (reservation) => reservation.status === "PENDING",
  );
  const reservationBySlotId = useMemo(() => {
    const map = new Map<string, Reservation>();
    for (const reservation of myPendingReservations) {
      const slotId = getReservationSlotId(reservation);
      if (!slotId) {
        continue;
      }
      const slot = floorSlots.find((item) => item._id === slotId);
      if (slot?.status === "CURRENTLY-IN-USED") {
        continue;
      }
      map.set(slotId, reservation);
    }
    return map;
  }, [myPendingReservations, floorSlots]);
  const selectedReservation = selectedSpot
    ? (reservationBySlotId.get(selectedSpot._id) ?? null)
    : null;
  const selectedFloorVehicleTypeId = selectedFloor?.vehicleType?._id ?? null;
  const compatibleVehicles = useMemo(
    () =>
      activeVehicles.filter((vehicle) => {
        const typeId = getVehicleTypeId(vehicle);
        if (!selectedFloorVehicleTypeId) {
          return Boolean(typeId);
        }
        return typeId === selectedFloorVehicleTypeId;
      }),
    [activeVehicles, selectedFloorVehicleTypeId],
  );
  const selectedReservationVehicle = compatibleVehicles.find(
    (vehicle) => vehicle._id === selectedReservationVehicleId,
  );
  const selectedVehicleReserveBlockReason = useMemo(() => {
    if (!selectedReservationVehicle) {
      return null;
    }
    return getVehicleReserveBlockReason(
      selectedReservationVehicle._id,
      selectedReservationVehicle.licensePlate,
      reservations,
      vehicleParkingSessions,
    );
  }, [selectedReservationVehicle, reservations, vehicleParkingSessions]);
  const profile = profileQuery.data ?? null;
  const viewingHistoryReservationDetail = useMemo(() => {
    if (!viewingHistoryReservation) {
      return null;
    }
    const session = findSessionForReservation(viewingHistoryReservation, sessionsByVehicleId);
    return enrichReservationForDetail(
      viewingHistoryReservation,
      parkingFloors,
      profile,
      session,
    );
  }, [viewingHistoryReservation, parkingFloors, profile, sessionsByVehicleId]);

  const viewingHistoryParkingSession = useMemo(() => {
    if (!viewingHistoryReservation) {
      return null;
    }
    return findSessionForReservation(viewingHistoryReservation, sessionsByVehicleId);
  }, [viewingHistoryReservation, sessionsByVehicleId]);

  const availableCount = floorSlots.filter((slot) => slot.status === "AVAILABLE").length;
  const reservedCount = floorSlots.filter((slot) => slot.status === "RESERVED").length;
  const unavailableCount = floorSlots.filter((slot) => slot.status === "UNAVAILABLE").length;
  const inUsedCount = floorSlots.filter((slot) => slot.status === "CURRENTLY-IN-USED").length;

  const isVehicleTypeLoading = vehicleTypesQuery.isLoading && vehicleTypes.length === 0;

  useEffect(() => {
    const selectedTypeStillExists = vehicleTypes.some((type) => type._id === vehicleTypeId);
    if (vehicleTypes.length > 0 && (!vehicleTypeId || !selectedTypeStillExists)) {
      setVehicleTypeId(vehicleTypes[0]._id);
    }
  }, [vehicleTypeId, vehicleTypes]);

  useEffect(() => {
    if (parkingFloors.length === 0) {
      return;
    }
    const selectedFloorStillExists = parkingFloors.some((floor) => floor._id === selectedFloorId);
    if (!selectedFloorStillExists) {
      setSelectedFloorId(parkingFloors[0]._id);
    }
  }, [parkingFloors, selectedFloorId]);

  useEffect(() => {
    setSelectedSpotId(null);
  }, [selectedFloorId]);

  useEffect(() => {
    if (compatibleVehicles.length === 0) {
      setSelectedReservationVehicleId("");
      return;
    }

    const selectedVehicleStillCompatible = compatibleVehicles.some(
      (vehicle) => vehicle._id === selectedReservationVehicleId,
    );
    if (!selectedVehicleStillCompatible) {
      setSelectedReservationVehicleId(compatibleVehicles[0]._id);
    }
  }, [compatibleVehicles, selectedReservationVehicleId]);

  const handleVehicleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setVehicleFormError(null);

    const normalizedPlate = licensePlate.trim().replace(/\s+/g, " ").toUpperCase();
    if (normalizedPlate.length < 4) {
      setVehicleFormError("Nhập biển số hợp lệ.");
      return;
    }
    if (!vehicleTypeId || vehicleTypes.length === 0) {
      setVehicleFormError(
        vehicleTypes.length === 0
          ? "Loại xe chưa sẵn sàng từ hệ thống. Làm mới danh sách loại xe và thử lại."
          : "Chọn loại xe.",
      );
      return;
    }

    createVehicleMutation.mutate({
      licensePlate: normalizedPlate,
      vehicleTypeId,
    });
  };

  const handleDeleteVehicle = (vehicle: Vehicle) => {
    const confirmed = window.confirm(
      `Xóa xe ${vehicle.licensePlate}?\n\nXe sẽ chuyển sang trạng thái INACTIVE (soft delete), không bị xóa vĩnh viễn khỏi hệ thống.`,
    );
    if (!confirmed) {
      return;
    }
    setDeletingVehicleId(vehicle._id);
    deleteVehicleMutation.mutate(vehicle._id);
  };

  const handleEditVehicleOpenChange = (open: boolean) => {
    setIsEditVehicleOpen(open);
    if (!open) {
      setEditingVehicle(null);
      setEditVehicleError(null);
      setEditVehicleLicensePlate("");
      setEditVehicleTypeId("");
    }
  };

  const handleStartEditVehicle = (vehicle: Vehicle) => {
    setEditingVehicle(vehicle);
    setEditVehicleError(null);
    setEditVehicleLicensePlate(vehicle.licensePlate);
    setEditVehicleTypeId(getVehicleTypeId(vehicle) ?? "");
    setIsEditVehicleOpen(true);

    if (vehicleTypes.length === 0 && !vehicleTypesQuery.isFetching) {
      void vehicleTypesQuery.refetch();
    }
  };

  const handleEditVehicleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!editingVehicle) {
      return;
    }
    setEditVehicleError(null);

    const normalizedPlate = editVehicleLicensePlate.trim().replace(/\s+/g, " ").toUpperCase();
    if (normalizedPlate.length < 4) {
      setEditVehicleError("Nhập biển số hợp lệ.");
      return;
    }
    if (!editVehicleTypeId) {
      setEditVehicleError("Chọn loại xe.");
      return;
    }

    const payload: { licensePlate?: string; vehicleTypeId?: string } = {};
    if (normalizedPlate !== editingVehicle.licensePlate.toUpperCase()) {
      payload.licensePlate = normalizedPlate;
    }

    const currentVehicleTypeId = getVehicleTypeId(editingVehicle);
    if (editVehicleTypeId !== currentVehicleTypeId) {
      payload.vehicleTypeId = editVehicleTypeId;
    }

    if (Object.keys(payload).length === 0) {
      setEditVehicleError("Bạn chưa thay đổi thông tin xe nào.");
      return;
    }

    updateVehicleMutation.mutate({
      vehicleId: editingVehicle._id,
      payload,
    });
  };

  const vehicleListError =
    vehiclesQuery.isError && !vehiclesQuery.data
      ? getErrorMessage(vehiclesQuery.error, "Không thể tải danh sách xe.")
      : null;
  const vehicleTypeError = vehicleTypesQuery.error
    ? getErrorMessage(vehicleTypesQuery.error, "Không thể tải loại xe.")
    : null;
  const profileError = profileQuery.error
    ? getErrorMessage(profileQuery.error, "Không thể tải hồ sơ.")
    : null;
  const parkingFloorsError =
    parkingFloorsQuery.isError && !parkingFloorsQuery.data
      ? getErrorMessage(parkingFloorsQuery.error, "Không thể tải danh sách chỗ đỗ.")
      : null;

  const handleVehicleFormOpenChange = (open: boolean) => {
    setIsVehicleFormOpen(open);
    if (open) {
      setVehicleFormError(null);
      if (vehicleTypes.length === 0 && !vehicleTypesQuery.isFetching) {
        void vehicleTypesQuery.refetch();
      }
    }
  };

  const handleProfileOpenChange = (open: boolean) => {
    setIsProfileOpen(open);
    if (open) {
      void profileQuery.refetch();
    }
  };

  const handleEditProfileOpenChange = (open: boolean) => {
    setIsEditProfileOpen(open);
    if (open) {
      setEditProfileError(null);
      setEditFullName(profile?.fullName ?? "");
      setEditPhone(profile?.phone ?? "");
    }
  };

  const handleEditProfileSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setEditProfileError(null);

    const fullName = editFullName.trim();
    const phone = editPhone.trim();

    if (fullName.length < 2 || fullName.length > 30) {
      setEditProfileError("Họ tên phải từ 2 đến 30 kí tự.");
      return;
    }
    if (!/^[0-9]{10}$/.test(phone)) {
      setEditProfileError("Số điện thoại phải gồm đúng 10 chữ số.");
      return;
    }

    const payload: { fullName?: string; phone?: string } = {};
    if (fullName !== profile?.fullName) {
      payload.fullName = fullName;
    }
    if (phone !== profile?.phone) {
      payload.phone = phone;
    }

    if (Object.keys(payload).length === 0) {
      setEditProfileError("Bạn chưa thay đổi thông tin nào.");
      return;
    }

    updateProfileMutation.mutate(payload);
  };

  const myReservationsError =
    myReservationsQuery.isError && !myReservationsQuery.data
      ? getErrorMessage(myReservationsQuery.error, "Không thể tải đặt chỗ của bạn.")
      : null;
  const isReservationActionPending =
    reserveSlotMutation.isPending || cancelReservationMutation.isPending;

  const handleReserveSelectedSlot = () => {
    if (!selectedSpot) {
      toast.error("Hãy chọn một chỗ trước.");
      return;
    }
    if (selectedReservation) {
      toast.error("Chỗ này đã được bạn đặt rồi.");
      return;
    }
    if (selectedSpot.status !== "AVAILABLE") {
      toast.error("Chỗ này không khả dụng.");
      return;
    }
    if (!selectedReservationVehicle) {
      toast.error("Hãy chọn xe phù hợp trước.");
      return;
    }

    const blockReason = getVehicleReserveBlockReason(
      selectedReservationVehicle._id,
      selectedReservationVehicle.licensePlate,
      reservations,
      vehicleParkingSessions,
    );
    if (blockReason) {
      toast.error("Không thể đặt chỗ", { description: blockReason });
      return;
    }

    const expectedArrival = parseExpectedArrival(expectedArrivalDate, expectedArrivalTime);
    if (!expectedArrival) {
      toast.error("Chọn thời gian đến hợp lệ.");
      return;
    }
    if (expectedArrival.getTime() <= Date.now()) {
      toast.error("Thời gian đến phải ở tương lai.");
      return;
    }

    reserveSlotMutation.mutate({
      vehicleId: selectedReservationVehicle._id,
      parkingSlotId: selectedSpot._id,
      expectedArrival: expectedArrival.toISOString(),
    });
  };

  const handleCancelReservationById = (reservationId: string) => {
    cancelReservationMutation.mutate(reservationId);
  };

  const handleQuickActionClick = (actionId: QuickAction["id"]) => {
    const nextAction = activeQuickAction === actionId ? null : actionId;
    setActiveQuickAction(nextAction);

    if (!nextAction) {
      return;
    }

    requestAnimationFrame(() => {
      if (nextAction === "my-reservations") {
        reservationSectionRef.current?.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
        return;
      }
      reserveSectionRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    });
  };

  return (
    <div className="min-h-screen">
      <SiteHeader />
      <DashboardMain wide>
        <DashboardSection>
          <div className="flex flex-wrap items-start justify-between gap-5">
            <div className="flex min-w-0 items-center gap-4">
              <div className="relative">
                <div className="grid size-20 place-items-center rounded-full border border-border bg-secondary">
                  <UserRound className="size-10 text-muted-foreground" />
                </div>
                <span className="absolute bottom-1 right-1 size-3 rounded-full bg-status-empty ring-2 ring-card" />
              </div>

              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="truncate text-2xl font-semibold tracking-tight md:text-3xl">
                    {profile?.fullName ??
                      (profileQuery.isLoading ? "Đang tải hồ sơ..." : "Tài xế")}
                  </h1>
                  <span className="rounded-md border border-primary/40 bg-primary/15 px-2.5 py-1 text-xs font-semibold uppercase tracking-wide text-primary">
                    {profile
                      ? `${getProfileRoleName(profile)} · ${profile.status ?? "ACTIVE"}`
                      : "Đang hoạt động"}
                  </span>
                </div>
                <p className="mt-1 text-sm text-muted-foreground">
                  {profile?.email ?? "Email hồ sơ không khả dụng"}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Dialog open={isProfileOpen} onOpenChange={handleProfileOpenChange}>
                <DialogTrigger asChild>
                  <button
                    type="button"
                    className="inline-flex items-center gap-2 rounded-xl border border-border bg-secondary px-4 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-secondary/80"
                  >
                    <UserRound className="size-4" />
                    Xem hồ sơ
                  </button>
                </DialogTrigger>
                <DialogContent className="rounded-2xl border-border bg-card sm:max-w-lg">
                  <DialogHeader>
                    <DialogTitle>Hồ sơ của tôi</DialogTitle>
                    <DialogDescription>Thông tin tài khoản của tài xế hiện tại.</DialogDescription>
                  </DialogHeader>

                  {profileQuery.isLoading ? (
                    <div className="flex items-center gap-2 rounded-xl border border-border bg-background/45 px-3 py-3 text-sm text-muted-foreground">
                      <LoaderCircle className="size-4 animate-spin" />
                      Đang tải hồ sơ...
                    </div>
                  ) : profileError ? (
                    <div className="rounded-xl border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                      {profileError}
                    </div>
                  ) : profile ? (
                    <form className="grid gap-4">
                      <div className="grid gap-2">
                        <Label htmlFor="profile-full-name">Họ tên</Label>
                        <Input
                          id="profile-full-name"
                          value={profile.fullName}
                          className="h-11 rounded-xl"
                          readOnly
                        />
                      </div>

                      <div className="grid gap-2 sm:grid-cols-2">
                        <div className="grid gap-2">
                          <Label htmlFor="profile-email">Email</Label>
                          <div className="relative">
                            <Mail className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                            <Input
                              id="profile-email"
                              value={profile.email}
                              className="h-11 rounded-xl pl-9"
                              readOnly
                            />
                          </div>
                        </div>

                        <div className="grid gap-2">
                          <Label htmlFor="profile-phone">Số điện thoại</Label>
                          <div className="relative">
                            <Phone className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                            <Input
                              id="profile-phone"
                              value={profile.phone}
                              className="h-11 rounded-xl pl-9"
                              readOnly
                            />
                          </div>
                        </div>
                      </div>

                      <div className="grid gap-2 sm:grid-cols-2">
                        <div className="grid gap-2">
                          <Label htmlFor="profile-role">Vai trò</Label>
                          <Input
                            id="profile-role"
                            value={getProfileRoleName(profile)}
                            className="h-11 rounded-xl"
                            readOnly
                          />
                        </div>

                        <div className="grid gap-2">
                          <Label htmlFor="profile-status">Trạng thái</Label>
                          <Input
                            id="profile-status"
                            value={profile.status}
                            className="h-11 rounded-xl"
                            readOnly
                          />
                        </div>
                      </div>

                      <div className="grid gap-2">
                        <Label htmlFor="profile-created-at">Ngày tạo</Label>
                        <Input
                          id="profile-created-at"
                          value={formatProfileDate(profile.createdAt)}
                          className="h-11 rounded-xl"
                          readOnly
                        />
                      </div>
                    </form>
                  ) : null}
                </DialogContent>
              </Dialog>

              <Dialog open={isEditProfileOpen} onOpenChange={handleEditProfileOpenChange}>
                <DialogTrigger asChild>
                  <Button
                    type="button"
                    disabled={!profile}
                    className="h-[42px] rounded-xl px-4 text-sm font-semibold"
                  >
                    <Pencil className="size-4" />
                    Sửa hồ sơ
                  </Button>
                </DialogTrigger>
                <DialogContent className="rounded-2xl border-border bg-card sm:max-w-md">
                  <DialogHeader>
                    <DialogTitle>Sửa hồ sơ</DialogTitle>
                    <DialogDescription>Cập nhật họ tên và số điện thoại của bạn.</DialogDescription>
                  </DialogHeader>

                  <form onSubmit={handleEditProfileSubmit} className="grid gap-4">
                    <div className="grid gap-2">
                      <Label htmlFor="edit-profile-full-name">Họ tên</Label>
                      <Input
                        id="edit-profile-full-name"
                        value={editFullName}
                        onChange={(event) => setEditFullName(event.target.value)}
                        className="h-11 rounded-xl"
                        autoComplete="name"
                        required
                      />
                    </div>

                    <div className="grid gap-2">
                      <Label htmlFor="edit-profile-phone">Số điện thoại</Label>
                      <div className="relative">
                        <Phone className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                        <Input
                          id="edit-profile-phone"
                          value={editPhone}
                          onChange={(event) =>
                            setEditPhone(event.target.value.replace(/[^0-9]/g, ""))
                          }
                          className="h-11 rounded-xl pl-9"
                          inputMode="numeric"
                          autoComplete="tel"
                          maxLength={10}
                          required
                        />
                      </div>
                    </div>

                    {editProfileError ? (
                      <div className="rounded-xl border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                        {editProfileError}
                      </div>
                    ) : null}

                    <Button
                      type="submit"
                      disabled={updateProfileMutation.isPending}
                      className="h-11 w-full rounded-xl text-[13px] font-semibold"
                    >
                      {updateProfileMutation.isPending ? (
                        <>
                          <LoaderCircle className="size-4 animate-spin" />
                          Đang lưu...
                        </>
                      ) : (
                        <>
                          <Save className="size-4" />
                          Lưu thay đổi
                        </>
                      )}
                    </Button>
                  </form>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </DashboardSection>

        <DashboardSection ref={vehiclesSectionRef} compact>
          <div className="flex flex-wrap items-start justify-between gap-4">
            <ToggleExpandedButton
              type="button"
              expanded={isVehiclesExpanded}
              onClick={() => setIsVehiclesExpanded((expanded) => !expanded)}
              className="flex min-w-0 flex-1 items-start gap-2 rounded-lg text-left transition hover:opacity-90"
            >
              <div className="min-w-0 space-y-1">
                <h2 className="text-lg font-semibold tracking-tight text-foreground md:text-xl">
                  Xe của tôi
                </h2>
                <p className="text-sm text-muted-foreground">
                  {vehiclesQuery.isLoading
                    ? "Đang tải danh sách xe..."
                    : `${vehicles.length} xe đã đăng ký`}
                </p>
              </div>
              <ChevronDown
                className={`mt-1 size-5 shrink-0 text-muted-foreground transition-transform ${
                  isVehiclesExpanded ? "rotate-180" : ""
                }`}
              />
            </ToggleExpandedButton>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                aria-label="Làm mới danh sách xe"
                onClick={() => void vehiclesQuery.refetch()}
                disabled={vehiclesQuery.isFetching}
                className="inline-flex size-9 items-center justify-center rounded-xl border border-border bg-secondary text-muted-foreground transition-colors hover:text-foreground disabled:cursor-not-allowed disabled:opacity-50"
              >
                <RefreshCw className={`size-4 ${vehiclesQuery.isFetching ? "animate-spin" : ""}`} />
              </button>

              <Dialog open={isVehicleFormOpen} onOpenChange={handleVehicleFormOpenChange}>
                <DialogTrigger asChild>
                  <Button type="button" variant="secondary" className="h-9 rounded-xl px-4 text-[13px] font-semibold">
                    <Plus className="size-4" />
                    Thêm xe
                  </Button>
                </DialogTrigger>
                <DialogContent className="rounded-2xl border-border bg-card sm:max-w-md">
                  <DialogHeader>
                    <DialogTitle>Thêm xe mới</DialogTitle>
                    <DialogDescription>
                      Nhập biển số và loại xe để đăng ký vào tài khoản của bạn.
                    </DialogDescription>
                  </DialogHeader>

                  <form onSubmit={handleVehicleSubmit} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="vehicle-license-plate">Biển số</Label>
                      <Input
                        id="vehicle-license-plate"
                        value={licensePlate}
                        onChange={(event) => setLicensePlate(event.target.value.toUpperCase())}
                        autoCapitalize="characters"
                        autoComplete="off"
                        inputMode="text"
                        placeholder="51A-12345"
                        className="h-11 rounded-xl font-mono tracking-wide"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="vehicle-type">Loại xe</Label>
                      <Select
                        value={vehicleTypeId}
                        onValueChange={setVehicleTypeId}
                        disabled={isVehicleTypeLoading}
                      >
                        <SelectTrigger id="vehicle-type" className="h-11 rounded-xl">
                          <SelectValue
                            placeholder={isVehicleTypeLoading ? "Đang tải loại xe..." : "Chọn loại xe"}
                          />
                        </SelectTrigger>
                        <SelectContent>
                          {vehicleTypes.map((type) => (
                            <SelectItem key={type._id} value={type._id}>
                              {type.type}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {vehicleFormError || vehicleTypeError ? (
                      <div className="rounded-xl border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                        {vehicleFormError ?? vehicleTypeError}
                      </div>
                    ) : null}

                    {vehicleTypes.length === 0 && !isVehicleTypeLoading ? (
                      <Button
                        type="button"
                        variant="secondary"
                        onClick={() => void vehicleTypesQuery.refetch()}
                        className="h-10 w-full rounded-xl text-[13px] font-semibold"
                      >
                        <RefreshCw
                          className={`size-4 ${vehicleTypesQuery.isFetching ? "animate-spin" : ""}`}
                        />
                        Làm mới loại xe
                      </Button>
                    ) : null}

                    <Button
                      type="submit"
                      disabled={createVehicleMutation.isPending || isVehicleTypeLoading}
                      className="h-11 w-full rounded-xl text-[13px] font-semibold"
                    >
                      {createVehicleMutation.isPending ? (
                        <>
                          <LoaderCircle className="size-4 animate-spin" />
                          Đang đăng ký...
                        </>
                      ) : (
                        <>
                          <Plus className="size-4" />
                          Thêm xe
                        </>
                      )}
                    </Button>
                  </form>
                </DialogContent>
              </Dialog>
            </div>
          </div>

          <Dialog open={isEditVehicleOpen} onOpenChange={handleEditVehicleOpenChange}>
            <DialogContent className="rounded-2xl border-border bg-card sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Sửa xe</DialogTitle>
                <DialogDescription>Cập nhật biển số hoặc loại xe.</DialogDescription>
              </DialogHeader>

              <form onSubmit={handleEditVehicleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-vehicle-license-plate">Biển số</Label>
                  <Input
                    id="edit-vehicle-license-plate"
                    value={editVehicleLicensePlate}
                    onChange={(event) =>
                      setEditVehicleLicensePlate(event.target.value.toUpperCase())
                    }
                    autoCapitalize="characters"
                    autoComplete="off"
                    inputMode="text"
                    placeholder="51A-12345"
                    className="h-11 rounded-xl font-mono tracking-wide"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="edit-vehicle-type">Loại xe</Label>
                  <Select
                    value={editVehicleTypeId}
                    onValueChange={setEditVehicleTypeId}
                    disabled={vehicleTypesQuery.isLoading && vehicleTypes.length === 0}
                  >
                    <SelectTrigger id="edit-vehicle-type" className="h-11 rounded-xl">
                      <SelectValue placeholder="Chọn loại xe" />
                    </SelectTrigger>
                    <SelectContent>
                      {vehicleTypes.map((type) => (
                        <SelectItem key={type._id} value={type._id}>
                          {type.type}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {editVehicleError ? (
                  <div className="rounded-xl border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                    {editVehicleError}
                  </div>
                ) : null}

                <Button
                  type="submit"
                  disabled={updateVehicleMutation.isPending}
                  className="h-11 w-full rounded-xl text-[13px] font-semibold"
                >
                  {updateVehicleMutation.isPending ? (
                    <>
                      <LoaderCircle className="size-4 animate-spin" />
                          Đang cập nhật...
                    </>
                  ) : (
                    <>
                      <Save className="size-4" />
                          Lưu thay đổi
                    </>
                  )}
                </Button>
              </form>
            </DialogContent>
          </Dialog>

          {isVehiclesExpanded ? (
            <div className="dashboard-panel mt-4 max-h-72 overflow-y-auto">
            {vehiclesQuery.isLoading ? (
              <div className="flex items-center gap-2 p-4 text-sm text-muted-foreground">
                <LoaderCircle className="size-4 animate-spin" />
                Đang tải xe của bạn...
              </div>
            ) : vehicleListError ? (
              <div className="p-4 text-sm text-destructive">{vehicleListError}</div>
            ) : vehicles.length > 0 ? (
              vehicles.map((vehicle) => {
                const isInactive = vehicle.status === "INACTIVE";
                return (
                <div
                  key={vehicle._id}
                  className={`flex flex-wrap items-center justify-between gap-3 border-t border-border/70 p-4 first:border-t-0 ${
                    isInactive ? "opacity-50" : ""
                  }`}
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="grid size-10 shrink-0 place-items-center rounded-xl border border-border bg-background/65">
                      <CarFront className={`size-5 ${isInactive ? "text-muted-foreground" : "text-primary"}`} />
                    </div>
                    <div className="min-w-0">
                      <p className="truncate font-mono text-sm font-semibold tracking-wide">
                        {vehicle.licensePlate}
                      </p>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {getVehicleTypeName(vehicle, vehicleTypes)} |{" "}
                        {formatRegisteredDate(vehicle.createdAt)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    {isInactive ? (
                      <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-muted/40 px-2.5 py-1 text-xs font-medium text-muted-foreground">
                        <CircleDashed className="size-3.5" />
                        Ngừng hoạt động
                      </span>
                    ) : (
                      <>
                        <span className="inline-flex items-center gap-1.5 rounded-full border border-status-empty/35 bg-status-empty/10 px-2.5 py-1 text-xs font-medium text-status-empty">
                          <CheckCircle2 className="size-3.5" />
                          {vehicle.monthlyCardId ? "Thẻ tháng" : "Đã đăng ký"}
                        </span>
                        <Button
                          type="button"
                          size="icon"
                          variant="ghost"
                          onClick={() => handleStartEditVehicle(vehicle)}
                          className="size-8 rounded-lg"
                          aria-label={`Sửa ${vehicle.licensePlate}`}
                        >
                          <Pencil className="size-3.5" />
                        </Button>
                        <Button
                          type="button"
                          size="icon"
                          variant="ghost"
                          onClick={() => handleDeleteVehicle(vehicle)}
                          disabled={deletingVehicleId === vehicle._id}
                          className="size-8 rounded-lg text-destructive hover:bg-destructive/10 hover:text-destructive"
                          aria-label={`Xóa ${vehicle.licensePlate}`}
                        >
                          {deletingVehicleId === vehicle._id ? (
                            <LoaderCircle className="size-3.5 animate-spin" />
                          ) : (
                            <Trash2 className="size-3.5" />
                          )}
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              );
              })
            ) : (
              <div className="p-4 text-sm text-muted-foreground">
                Bạn chưa có xe nào. Bấm &quot;Thêm xe&quot; để đăng ký biển số.
              </div>
            )}
            </div>
          ) : null}
        </DashboardSection>

        <DashboardSection compact className="p-3">
          <div className="grid gap-2 md:grid-cols-2">
            {quickActions.map((action) => {
              const Icon = action.icon;
              const isActionHighlighted = action.id === activeQuickAction;
              return (
                <TogglePressedButton
                  key={action.title}
                  type="button"
                  pressed={isActionHighlighted}
                  onClick={() => handleQuickActionClick(action.id)}
                  className={`rounded-xl border px-4 py-4 text-left transition ${
                    isActionHighlighted
                      ? "border-primary/50 bg-primary/15 shadow-sm"
                      : "border-border bg-secondary hover:bg-secondary/80"
                  }`}
                >
                  <div className="mb-3 inline-flex size-9 items-center justify-center rounded-lg border border-border bg-card">
                    <Icon className="size-4 text-primary" />
                  </div>
                  <h2 className="text-base font-semibold tracking-tight">{action.title}</h2>
                </TogglePressedButton>
              );
            })}
          </div>
        </DashboardSection>

        {activeQuickAction === "my-reservations" ? (
          <DashboardSection ref={reservationSectionRef}>
            <DashboardSectionHeader
              kicker="Đặt chỗ của tôi"
              title="Lịch sử đặt chỗ"
              actions={
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() =>
                    void Promise.all([
                      myReservationsQuery.refetch(),
                      parkingFloorsQuery.refetch(),
                      vehicleParkingSessionsQuery.refetch(),
                    ])
                  }
                  disabled={
                    myReservationsQuery.isFetching || vehicleParkingSessionsQuery.isFetching
                  }
                  className="h-10 rounded-xl"
                >
                  <RefreshCw
                    className={`size-4 ${myReservationsQuery.isFetching ? "animate-spin" : ""}`}
                  />
                  Làm mới
                </Button>
              }
            />

            <div className="mt-4 flex flex-wrap items-end gap-3">
              <div className="space-y-2">
                <Label htmlFor="reservation-history-date">Ngày</Label>
                <Input
                  id="reservation-history-date"
                  type="date"
                  value={reservationHistoryDate}
                  onChange={(event) => setReservationHistoryDate(event.target.value)}
                  className="h-10 w-full min-w-[180px] rounded-xl sm:w-auto"
                />
              </div>
              {reservationHistoryDate !== getLocalDateInputValue() ? (
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setReservationHistoryDate(getLocalDateInputValue())}
                  className="h-10 rounded-xl"
                >
                  Hôm nay
                </Button>
              ) : null}
            </div>

            {myReservationsQuery.isLoading ? (
              <div className="mt-4 flex items-center gap-2 rounded-2xl border border-border bg-background/40 px-4 py-3 text-sm text-muted-foreground">
                <LoaderCircle className="size-4 animate-spin" />
                Đang tải đặt chỗ...
              </div>
            ) : myReservationsError ? (
              <div className="mt-4 rounded-2xl border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                {myReservationsError}
              </div>
            ) : filteredHistoryReservations.length > 0 ? (
              <div className="mt-4 space-y-3">
                {filteredHistoryReservations.map((reservation) => {
                  const reservationSlotId = getReservationSlotId(reservation);
                  const parkingSession = findSessionForReservation(
                    reservation,
                    sessionsByVehicleId,
                  );
                  const displayStatus = getReservationDisplayStatus(reservation, parkingSession);
                  const isPending = displayStatus === "PENDING";
                  return (
                    <div
                      key={reservation._id}
                      role="button"
                      tabIndex={0}
                      onClick={() => setViewingHistoryReservation(reservation)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter" || event.key === " ") {
                          event.preventDefault();
                          setViewingHistoryReservation(reservation);
                        }
                      }}
                      className="w-full cursor-pointer rounded-xl border border-border bg-secondary p-4 text-left transition hover:border-primary/40 hover:bg-secondary/80"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div>
                          <p className="font-mono text-sm font-semibold">
                            {getReservationSlotLabel(reservation)}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Xe: {getReservationVehicleLabel(reservation) ?? "Không có"}
                          </p>
                        </div>
                        <span
                          className={`rounded-full border px-2.5 py-1 text-xs font-medium ${getReservationStatusBadge(displayStatus)}`}
                        >
                          {getReservationStatusLabel(displayStatus)}
                        </span>
                      </div>

                      <div className="mt-3 grid gap-1 text-xs text-muted-foreground sm:grid-cols-2">
                        <p>
                          Thời gian đến:{" "}
                          {reservation.expectedArrival
                            ? formatDateTime(reservation.expectedArrival)
                            : "Không có"}
                        </p>
                        <p>
                          Hết hạn:{" "}
                          {reservation.expiryAt ? formatDateTime(reservation.expiryAt) : "Không có"}
                        </p>
                        {parkingSession?.checkInTime ? (
                          <p>Check-in: {formatDateTime(parkingSession.checkInTime)}</p>
                        ) : null}
                        {parkingSession?.checkOutTime ? (
                          <p>Check-out: {formatDateTime(parkingSession.checkOutTime)}</p>
                        ) : null}
                      </div>

                      {isPending ? (
                        <div className="mt-3">
                          <Button
                            type="button"
                            variant="secondary"
                            onClick={(event) => {
                              event.stopPropagation();
                              handleCancelReservationById(reservation._id);
                            }}
                            disabled={cancelReservationMutation.isPending}
                            className="h-9 rounded-xl text-sm font-medium"
                          >
                            {cancelReservationMutation.isPending ? (
                              <>
                                <LoaderCircle className="size-4 animate-spin" />
                                Đang xóa...
                              </>
                            ) : (
                              "Xóa đặt chỗ"
                            )}
                          </Button>
                        </div>
                      ) : null}

                      {reservationSlotId && reservationBySlotId.has(reservationSlotId) ? (
                        <p className="mt-2 text-xs text-status-yours">
                          Chỗ này hiện đang được giữ cho bạn.
                        </p>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            ) : (
              <DashboardEmptyState className="mt-4 text-left">
                Không có đặt chỗ nào vào {formatReservationHistoryDateLabel(reservationHistoryDate)}.
              </DashboardEmptyState>
            )}
          </DashboardSection>
        ) : null}

        {activeQuickAction === "reserve" ? (
          <div ref={reserveSectionRef}>
            <DashboardSection>
              <DashboardSectionHeader
                kicker="Xem thông tin đỗ xe"
                title={selectedFloor?.floorName ?? "Sơ đồ tầng"}
                actions={
                  <>
                    <DashboardLegend label={`Trống ${availableCount}`} tone="bg-status-empty" />
                    <DashboardLegend label={`Đã đặt ${reservedCount}`} tone="bg-status-reserved" />
                    <DashboardLegend label={`Không khả dụng ${unavailableCount}`} tone="bg-status-maintenance" />
                    <DashboardLegend label={`Đang dùng ${inUsedCount}`} tone="bg-status-full" />
                  </>
                }
              />

              <div className="mt-4 grid gap-3 sm:grid-cols-[240px_auto]">
                <div className="space-y-2">
                  <Label htmlFor="driver-floor-filter">Tầng</Label>
                  <Select value={selectedFloorId} onValueChange={setSelectedFloorId}>
                    <SelectTrigger id="driver-floor-filter" className="h-10 rounded-xl">
                      <SelectValue placeholder="Chọn tầng" />
                    </SelectTrigger>
                    <SelectContent>
                      {parkingFloors.map((floor) => (
                        <SelectItem key={floor._id} value={floor._id}>
                          {floor.floorName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-end justify-end">
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => void parkingFloorsQuery.refetch()}
                    disabled={parkingFloorsQuery.isFetching}
                    className="h-10 rounded-xl"
                  >
                    <RefreshCw
                      className={`size-4 ${parkingFloorsQuery.isFetching ? "animate-spin" : ""}`}
                    />
                    Làm mới chỗ đỗ
                  </Button>
                </div>
              </div>

              {parkingFloorsQuery.isLoading ? (
                <div className="mt-4 flex items-center gap-2 rounded-2xl border border-border bg-background/40 px-4 py-3 text-sm text-muted-foreground">
                  <LoaderCircle className="size-4 animate-spin" />
                  Đang tải chỗ đỗ theo tầng...
                </div>
              ) : parkingFloorsError ? (
                <div className="mt-4 rounded-2xl border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                  {parkingFloorsError}
                </div>
              ) : floorSlots.length > 0 ? (
                <div className="mt-4 grid grid-cols-5 gap-2 sm:grid-cols-8 xl:grid-cols-10">
                  {floorSlots.map((slot) => {
                    const isAvailable = slot.status === "AVAILABLE";
                    const isReserved = slot.status === "RESERVED";
                    const isReservedByMe = reservationBySlotId.has(slot._id);
                    const isSelectable = isAvailable || isReservedByMe;
                    const isSelected = selectedSpotId === slot._id;
                    const slotLabel = isReservedByMe
                      ? "Bạn đã đặt"
                      : slotStatusText[slot.status];
                    const slotStyle = isReservedByMe
                      ? reservedByYouButtonStyle
                      : slotButtonStyles[slot.status];
                    const statusLabel = isReservedByMe
                      ? "Của bạn"
                      : isReserved
                        ? "Đã đặt"
                        : null;
                    return (
                      <button
                        key={slot._id}
                        type="button"
                        disabled={!isSelectable}
                        onClick={() => setSelectedSpotId(slot._id)}
                        className={`relative flex h-11 w-full min-w-0 flex-col items-center justify-center gap-0.5 rounded-xl border px-1.5 py-1 text-center text-sm font-semibold transition ${slotStyle} ${
                          isSelected ? "border-primary ring-2 ring-inset ring-primary/70" : ""
                        } ${isSelectable ? "cursor-pointer" : ""}`}
                        aria-label={`${slot.slotNumber} (${slotLabel})`}
                      >
                        <span className="font-mono text-[11px] leading-none">{slot.slotNumber}</span>
                        {statusLabel ? (
                          <span className="min-h-[10px] font-mono text-[8px] uppercase leading-none tracking-[0.1em] opacity-100">
                            {statusLabel}
                          </span>
                        ) : (
                          <span
                            className="min-h-[10px] font-mono text-[8px] uppercase leading-none tracking-[0.1em] opacity-0"
                            aria-hidden="true"
                          >
                            —
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              ) : (
                <DashboardEmptyState className="mt-4 text-left">
                  Không có chỗ đỗ nào trên tầng này.
                </DashboardEmptyState>
              )}
            </DashboardSection>
          </div>
        ) : null}
      </DashboardMain>

      <Dialog
        open={selectedSpot !== null}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedSpotId(null);
          }
        }}
      >
        <DialogContent className="max-w-md rounded-2xl border-border bg-card">
          {selectedSpot ? (
            <>
              <DialogHeader>
                <DialogTitle>Đặt chỗ đỗ xe</DialogTitle>
                <DialogDescription>
                  Slot {selectedSpot.slotNumber}
                  {selectedFloor ? ` · ${selectedFloor.floorName}` : ""}
                </DialogDescription>
              </DialogHeader>

              <div className="flex items-center justify-between rounded-xl border border-border bg-secondary px-4 py-3">
                <span className="font-mono text-sm font-semibold">{selectedSpot.slotNumber}</span>
                <span
                  className={`rounded-full border px-2.5 py-1 text-xs font-medium ${
                    selectedReservation
                      ? reservedByYouBadgeStyle
                      : slotStatusBadge[selectedSpot.status]
                  }`}
                >
                  {selectedReservation ? "Bạn đã đặt" : slotStatusText[selectedSpot.status]}
                </span>
              </div>

              {myReservationsError ? (
                <div className="rounded-xl border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                  {myReservationsError}
                </div>
              ) : null}

              <div className="space-y-3">
                <div className="space-y-2">
                  <Label htmlFor="driver-reserve-vehicle">Xe</Label>
                  <Select
                    value={selectedReservationVehicleId}
                    onValueChange={setSelectedReservationVehicleId}
                    disabled={compatibleVehicles.length === 0 || Boolean(selectedReservation)}
                  >
                    <SelectTrigger id="driver-reserve-vehicle" className="h-10 rounded-xl">
                      <SelectValue placeholder="Chọn xe của bạn" />
                    </SelectTrigger>
                    <SelectContent>
                      {compatibleVehicles.map((vehicle) => (
                        <SelectItem key={vehicle._id} value={vehicle._id}>
                          {vehicle.licensePlate} · {getVehicleTypeName(vehicle, vehicleTypes)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="driver-expected-arrival-date">Ngày đến</Label>
                    <Input
                      id="driver-expected-arrival-date"
                      type="date"
                      value={expectedArrivalDate}
                      onChange={(event) => setExpectedArrivalDate(event.target.value)}
                      min={getLocalDateInputValue()}
                      disabled={Boolean(selectedReservation)}
                      className="h-10 rounded-xl"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="driver-expected-arrival-time">Giờ đến</Label>
                    <Input
                      id="driver-expected-arrival-time"
                      type="time"
                      value={expectedArrivalTime}
                      onChange={(event) => setExpectedArrivalTime(event.target.value)}
                      min={minExpectedArrivalTime}
                      disabled={Boolean(selectedReservation)}
                      className="h-10 rounded-xl"
                    />
                  </div>
                </div>

                {selectedReservation ? (
                  <div className="rounded-xl border border-status-yours/45 bg-status-yours/10 px-3 py-2 text-sm">
                    <p className="font-medium text-status-yours">Đặt chỗ hiện tại</p>
                    <div className="mt-1 space-y-1 text-xs text-muted-foreground">
                      <p>Xe: {getReservationVehicleLabel(selectedReservation) ?? "Không có"}</p>
                      <p>
                        Thời gian đến:{" "}
                        {selectedReservation.expectedArrival
                          ? formatDateTime(selectedReservation.expectedArrival)
                          : "Không có"}
                      </p>
                      <p>
                        Hết hạn:{" "}
                        {selectedReservation.expiryAt
                          ? formatDateTime(selectedReservation.expiryAt)
                          : "Không có"}
                      </p>
                      <p className="text-status-yours/80">Để hủy, vào mục Đặt chỗ của tôi.</p>
                    </div>
                  </div>
                ) : null}

                {selectedVehicleReserveBlockReason ? (
                  <p className="text-sm text-destructive">{selectedVehicleReserveBlockReason}</p>
                ) : null}

                <Button
                  type="button"
                  onClick={handleReserveSelectedSlot}
                  disabled={
                    isReservationActionPending ||
                    selectedSpot.status !== "AVAILABLE" ||
                    Boolean(selectedReservation) ||
                    !selectedReservationVehicle ||
                    Boolean(selectedVehicleReserveBlockReason)
                  }
                  className="h-10 w-full rounded-xl text-sm font-semibold"
                >
                  {reserveSlotMutation.isPending ? (
                    <>
                      <LoaderCircle className="size-4 animate-spin" />
                      Đang đặt chỗ...
                    </>
                  ) : (
                    <>
                      <MapPin className="size-4" />
                      Đặt chỗ này
                    </>
                  )}
                </Button>
              </div>
            </>
          ) : null}
        </DialogContent>
      </Dialog>

      <ReservationDetailDialog
        reservation={viewingHistoryReservationDetail}
        parkingSession={viewingHistoryParkingSession}
        open={viewingHistoryReservation !== null}
        onOpenChange={(open) => {
          if (!open) {
            setViewingHistoryReservation(null);
          }
        }}
        statusLabel={
          viewingHistoryReservation && viewingHistoryReservationDetail
            ? getReservationStatusLabel(
                getReservationDisplayStatus(
                  viewingHistoryReservation,
                  viewingHistoryParkingSession,
                ),
              )
            : undefined
        }
      />
      <DriverChatbotWidget />
    </div>
  );
}

function getLocalDateInputValue(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function reservationMatchesDateFilter(reservation: Reservation, dateKey: string) {
  const source = reservation.expectedArrival ?? reservation.reservedAt;
  if (!source) {
    return false;
  }
  return getLocalDateInputValue(new Date(source)) === dateKey;
}

function formatReservationHistoryDateLabel(dateKey: string) {
  const [year, month, day] = dateKey.split("-").map(Number);
  if (!year || !month || !day) {
    return dateKey;
  }
  return new Intl.DateTimeFormat("vi-VN", {
    weekday: "short",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(year, month - 1, day));
}

function parseExpectedArrival(dateValue: string, timeValue: string) {
  if (!dateValue || !timeValue) {
    return null;
  }

  const date = new Date(`${dateValue}T${timeValue}`);
  return Number.isNaN(date.getTime()) ? null : date;
}

function getDefaultExpectedArrivalDate() {
  return getLocalDateInputValue(new Date(Date.now() + 60 * 60_000));
}

function getDefaultExpectedArrivalTime() {
  return toLocalTimeInputValue(Date.now() + 60 * 60_000);
}

function toLocalTimeInputValue(timestamp: number) {
  const date = new Date(timestamp);
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  return `${hours}:${minutes}`;
}

function formatDateTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "Không có";
  }
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function getReservationVehicleLabel(reservation: Reservation) {
  if (typeof reservation.vehicleId === "object") {
    return reservation.vehicleId.licensePlate ?? reservation.vehicleId._id;
  }
  return reservation.vehicleId;
}

function getReservationSlotLabel(reservation: Reservation) {
  if (typeof reservation.parkingSlotId === "object") {
    return reservation.parkingSlotId.slotNumber ?? reservation.parkingSlotId._id;
  }
  return reservation.parkingSlotId;
}

function enrichReservationForDetail(
  reservation: Reservation,
  parkingFloors: ParkingFloor[],
  profile: UserProfile | null,
  parkingSession: ParkingSession | null = null,
): Reservation {
  const slotId = getReservationSlotId(reservation);
  const liveSlotStatus = slotId ? getSlotStatusFromFloors(slotId, parkingFloors) : null;
  const displayStatus = getReservationDisplayStatus(reservation, parkingSession);

  let nextReservation: Reservation = {
    ...reservation,
    status: displayStatus === "CHECKED IN" || displayStatus === "CHECKED OUT" ? "CLAIMED" : displayStatus,
  };

  if (profile && typeof nextReservation.driverId === "string") {
    nextReservation = {
      ...nextReservation,
      driverId: {
        _id: profile._id,
        fullName: profile.fullName,
        email: profile.email,
        phone: profile.phone,
      },
    };
  }

  if (liveSlotStatus && typeof nextReservation.parkingSlotId === "object") {
    return {
      ...nextReservation,
      parkingSlotId: {
        ...nextReservation.parkingSlotId,
        status: liveSlotStatus,
      },
    };
  }

  return nextReservation;
}

function getSlotStatusFromFloors(slotId: string, parkingFloors: ParkingFloor[]) {
  for (const floor of parkingFloors) {
    const slot = floor.slots?.find((item) => item._id === slotId);
    if (slot) {
      return slot.status;
    }
  }
  return null;
}

type ReservationDisplayStatus = Reservation["status"] | "CHECKED IN" | "CHECKED OUT";

function findSessionForReservation(
  reservation: Reservation,
  sessionsByVehicleId: Map<string, ParkingSession>,
) {
  const vehicleId = getReservationVehicleId(reservation);
  if (!vehicleId) {
    return null;
  }

  const session = sessionsByVehicleId.get(vehicleId);
  if (!session) {
    return null;
  }

  const reservationSlotId = getReservationSlotId(reservation);
  const sessionSlotId = getParkingSessionSlotId(session);
  if (reservationSlotId && sessionSlotId && reservationSlotId !== sessionSlotId) {
    return null;
  }

  return session;
}

function getReservationDisplayStatus(
  reservation: Reservation,
  parkingSession: ParkingSession | null,
): ReservationDisplayStatus {
  if (parkingSession?.status === "COMPLETED" && parkingSession.checkOutTime) {
    return "CHECKED OUT";
  }

  if (parkingSession?.status === "ACTIVE") {
    return "CHECKED IN";
  }

  if (reservation.status === "CLAIMED") {
    return "CHECKED IN";
  }

  return reservation.status as Reservation["status"];
}

function getReservationStatusBadge(status: ReservationDisplayStatus) {
  switch (status) {
    case "PENDING":
      return reservedByYouBadgeStyle;
    case "CLAIMED":
    case "CHECKED IN":
      return "border-status-empty/45 bg-status-empty/15 text-status-empty";
    case "CHECKED OUT":
      return "border-primary/45 bg-primary/15 text-primary";
    case "CANCELLED":
      return "border-border bg-muted text-muted-foreground";
    case "EXPIRED":
      return "border-status-full/45 bg-status-full/15 text-status-full";
    default:
      return "border-border bg-muted text-muted-foreground";
  }
}

function getReservationStatusLabel(status: ReservationDisplayStatus) {
  switch (status) {
    case "PENDING":
      return "Chờ xử lý";
    case "CLAIMED":
    case "CHECKED IN":
      return "Đã check-in";
    case "CHECKED OUT":
      return "Đã check-out";
    case "CANCELLED":
      return "Đã hủy";
    case "EXPIRED":
      return "Hết hạn";
    default:
      return status;
  }
}

function getVehicleTypeName(vehicle: Vehicle, vehicleTypes: VehicleType[]) {
  if (typeof vehicle.vehicleTypeId === "object" && vehicle.vehicleTypeId?.type) {
    return vehicle.vehicleTypeId.type;
  }

  const matchedType = vehicleTypes.find((type) => type._id === vehicle.vehicleTypeId);
  return matchedType?.type ?? "Xe";
}

function getVehicleTypeId(vehicle: Vehicle): string | null {
  if (typeof vehicle.vehicleTypeId === "object" && vehicle.vehicleTypeId?._id) {
    return vehicle.vehicleTypeId._id;
  }
  if (typeof vehicle.vehicleTypeId === "string") {
    return vehicle.vehicleTypeId;
  }
  return null;
}

function getProfileRoleName(profile: UserProfile) {
  if (typeof profile.roleId === "object" && profile.roleId?.roleName) {
    return profile.roleId.roleName;
  }

  return "CUSTOMER";
}

function formatProfileDate(value?: string) {
  return formatRegisteredDate(value);
}

function formatRegisteredDate(value?: string) {
  if (!value) {
    return "Đã đăng ký";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "Đã đăng ký";
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "2-digit",
    year: "numeric",
  }).format(date);
}

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error && error.message ? error.message : fallback;
}

function ToggleExpandedButton({
  expanded,
  children,
  ...props
}: ComponentPropsWithoutRef<"button"> & { expanded: boolean }) {
  return expanded ? (
    <button {...props} aria-expanded="true">
      {children}
    </button>
  ) : (
    <button {...props} aria-expanded="false">
      {children}
    </button>
  );
}

function TogglePressedButton({
  pressed,
  children,
  ...props
}: ComponentPropsWithoutRef<"button"> & { pressed: boolean }) {
  return pressed ? (
    <button {...props} aria-pressed="true">
      {children}
    </button>
  ) : (
    <button {...props} aria-pressed="false">
      {children}
    </button>
  );
}
