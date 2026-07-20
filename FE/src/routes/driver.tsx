import { useEffect, useMemo, useState, type FormEvent } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  CarFront,
  LoaderCircle,
  Mail,
  Pencil,
  Phone,
  Plus,
  RefreshCw,
  Save,
  UserRound,
} from "lucide-react";
import { toast } from "sonner";

import { DriverSubscriptionCheckoutDialog } from "@/components/driver/DriverSubscriptionCheckoutDialog";
import { DriverVehicleReserveDialog } from "@/components/driver/DriverVehicleReserveDialog";
import { DriverReservationsHistoryPanel } from "@/components/driver/DriverReservationsHistoryPanel";
import { DriverVehiclesReservationsPanel } from "@/components/driver/DriverVehiclesReservationsPanel";
import {
  attachPaymentIdToSubscriptionCheckout,
  cancelPendingSubscriptionCheckout,
  loadPendingSubscriptionCheckout,
  savePendingSubscriptionCheckout,
  type PendingSubscriptionCheckout,
} from "@/lib/pending-payment";
import { getVehicleReserveBlockReason } from "@/lib/parking-validation";
import { LICENSE_PLATE_PATTERN } from "@/lib/license-plate-ocr";
import {
  enrichReservationForDetail,
  findSessionForReservation,
  getReservationDisplayStatus,
  getReservationStatusLabel,
  sortReservationsByRecent,
} from "@/lib/driver-reservation-display";
import { SiteHeader } from "@/components/SiteHeader";
import { DriverChatbotWidget } from "@/components/chatbot/DriverChatbotWidget";
import { ReservationDetailDialog } from "@/components/ReservationDetailDialog";
import {
  DashboardMain,
  DashboardSection,
  DashboardTabs,
  paginateItems,
} from "@/components/dashboard-ui";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
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
import { requireRole } from "@/lib/auth";
import {
  fetchParkingSessionsForVehicleIds,
  getParkingFloors,
  getReservationVehicleId,
  type ParkingFloor,
  type ParkingSession,
} from "@/services/parking.service";
import { createSubscriptionCheckoutLink } from "@/services/payment.service";
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
import { changePassword, getMyProfile, updateMyProfile, UserApiError, type UserProfile } from "@/services/user.service";

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

const RESERVATION_HISTORY_PAGE_SIZE = 10;
const VEHICLE_PAGE_SIZE = 5;

type DriverTab = "manage" | "reservations";

const driverTabs: Array<{ id: DriverTab; label: string }> = [
  { id: "manage", label: "Xe & Đặt chỗ" },
  { id: "reservations", label: "Đã đặt chỗ" },
];

const vehicleTypesQueryKey = ["vehicle-types"] as const;
const myVehiclesQueryKey = ["my-vehicles"] as const;
const myProfileQueryKey = ["my-profile"] as const;
const parkingFloorsQueryKey = ["parking-floors"] as const;
const myReservationsQueryKey = ["my-reservations"] as const;
const myVehicleParkingSessionsQueryKey = ["my-vehicle-parking-sessions"] as const;
const DRIVER_LIVE_DATA_STALE_MS = 15_000;
const DRIVER_LIVE_DATA_REFETCH_MS = 30_000;
const emptyVehicleTypes: VehicleType[] = [];
const emptyVehicles: Vehicle[] = [];
const emptyParkingFloors: ParkingFloor[] = [];
const emptyReservations: Reservation[] = [];

function DriverPage() {
  const queryClient = useQueryClient();
  const [hasMounted, setHasMounted] = useState(false);
  const [reservingVehicle, setReservingVehicle] = useState<Vehicle | null>(null);
  const [isReserveDialogOpen, setIsReserveDialogOpen] = useState(false);
  const [licensePlate, setLicensePlate] = useState("");
  const [vehicleTypeId, setVehicleTypeId] = useState("");
  const [vehicleFormError, setVehicleFormError] = useState<string | null>(null);
  const [isVehicleFormOpen, setIsVehicleFormOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isEditProfileOpen, setIsEditProfileOpen] = useState(false);
  const [editFullName, setEditFullName] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editProfileError, setEditProfileError] = useState<string | null>(null);
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [changePasswordError, setChangePasswordError] = useState<string | null>(null);
  const [isChangePasswordOpen, setIsChangePasswordOpen] = useState(false);
  const [isChangePasswordSuccessOpen, setIsChangePasswordSuccessOpen] = useState(false);
  const [isEditVehicleOpen, setIsEditVehicleOpen] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState<Vehicle | null>(null);
  const [editVehicleLicensePlate, setEditVehicleLicensePlate] = useState("");
  const [editVehicleTypeId, setEditVehicleTypeId] = useState("");
  const [editVehicleError, setEditVehicleError] = useState<string | null>(null);
  const [deletingVehicleId, setDeletingVehicleId] = useState<string | null>(null);
  const [subscribingVehicleId, setSubscribingVehicleId] = useState<string | null>(null);
  const [subscriptionCheckout, setSubscriptionCheckout] =
    useState<PendingSubscriptionCheckout | null>(null);
  const [isSubscriptionCheckoutOpen, setIsSubscriptionCheckoutOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<DriverTab>("manage");
  const [reservationHistoryPage, setReservationHistoryPage] = useState(1);
  const [vehiclePage, setVehiclePage] = useState(1);
  const [vehiclePlateSearch, setVehiclePlateSearch] = useState("");
  const [viewingHistoryReservation, setViewingHistoryReservation] = useState<Reservation | null>(null);
  useEffect(() => {
    setHasMounted(true);
  }, []);

  const invalidateDriverLiveData = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: myVehiclesQueryKey }),
      queryClient.invalidateQueries({ queryKey: myReservationsQueryKey }),
      queryClient.invalidateQueries({ queryKey: parkingFloorsQueryKey }),
      queryClient.invalidateQueries({ queryKey: myVehicleParkingSessionsQueryKey }),
    ]);
  };

  const driverLiveQueryOptions = {
    enabled: hasMounted,
    staleTime: DRIVER_LIVE_DATA_STALE_MS,
    refetchOnWindowFocus: true,
    refetchInterval: DRIVER_LIVE_DATA_REFETCH_MS,
  } as const;

  const profileQuery = useQuery({
    queryKey: myProfileQueryKey,
    queryFn: getMyProfile,
    enabled: hasMounted, // chỉ gọi api khi user vào web an toàn
    staleTime: 0,
    refetchOnWindowFocus: true, // khi user focus lại web, query sẽ được gọi lại
  });
  const vehicleTypesQuery = useQuery({
    queryKey: vehicleTypesQueryKey,
    queryFn: getVehicleTypes,
    enabled: hasMounted,
  });
  const vehiclesQuery = useQuery({
    queryKey: myVehiclesQueryKey,
    queryFn: getMyVehicles,
    ...driverLiveQueryOptions,
  });
  const parkingFloorsQuery = useQuery({
    queryKey: parkingFloorsQueryKey,
    queryFn: () => getParkingFloors(),
    ...driverLiveQueryOptions,
  });
  const myReservationsQuery = useQuery({
    queryKey: myReservationsQueryKey,
    queryFn: () => getMyReservations(),
    ...driverLiveQueryOptions,
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
    ...driverLiveQueryOptions,
    enabled: hasMounted && activeVehicleIds.length > 0,
  });

  useEffect(() => {
    if (!hasMounted) {
      return;
    }
    void invalidateDriverLiveData();
  }, [activeTab, hasMounted]);

  const createVehicleMutation = useMutation({
    mutationFn: createVehicle,
    onSuccess: async (vehicle) => {
      setLicensePlate("");
      setVehicleFormError(null);
      setIsVehicleFormOpen(false);
      toast.success("Đăng ký xe thành công", {
        description: `${vehicle.licensePlate} đã được thêm vào tài khoản của bạn.`,
      });
      await invalidateDriverLiveData();
    },
    onError: (error) => {
      const raw = getErrorMessage(error, "Không thể đăng ký xe.");
      setVehicleFormError(
        /license plate must follow format/i.test(raw)
          ? "Biển số phải đúng dạng 51A-123.45"
          : raw,
      );
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
      await invalidateDriverLiveData();
    },
    onError: (error) => {
      const raw = getErrorMessage(error, "Không thể cập nhật xe.");
      setEditVehicleError(
        /license plate must follow format/i.test(raw)
          ? "Biển số phải đúng dạng 51A-123.45"
          : raw,
      );
    },
  });
  const deleteVehicleMutation = useMutation({
    mutationFn: softDeleteMyVehicle,
    onSuccess: async (deletedVehicle) => {
      setDeletingVehicleId(null);
      toast.success("Đã xóa xe", {
        description: `${deletedVehicle.licensePlate} đã chuyển sang trạng thái INACTIVE.`,
      });
      await invalidateDriverLiveData();
    },
    onError: (error) => {
      setDeletingVehicleId(null);
      toast.error("Không thể xóa xe", {
        description: getErrorMessage(error, "Vui lòng thử lại."),
      });
    },
  });

  const subscribeMonthlyMutation = useMutation({
    mutationFn: async (vehicle: Vehicle) => {
      const { checkoutUrl } = await createSubscriptionCheckoutLink(vehicle._id);
      const checkout: PendingSubscriptionCheckout = {
        vehicleId: vehicle._id,
        licensePlate: vehicle.licensePlate,
        checkoutUrl,
        createdAt: Date.now(),
      };
      const checkoutWithPayment = await attachPaymentIdToSubscriptionCheckout(checkout);
      savePendingSubscriptionCheckout(checkoutWithPayment);
      return checkoutWithPayment;
    },
    onSuccess: (checkout) => {
      setSubscribingVehicleId(null);
      setSubscriptionCheckout(checkout);
      setIsSubscriptionCheckoutOpen(true);
      toast.success("Đã tạo link thanh toán", {
        description: "Mở PayOS để hoàn tất mua thẻ tháng.",
      });
    },
    onError: (error) => {
      setSubscribingVehicleId(null);
      toast.error("Không thể tạo link thanh toán", {
        description: getErrorMessage(error, "Vui lòng thử lại."),
      });
    },
  });

  const cancelSubscriptionCheckoutMutation = useMutation({
    mutationFn: cancelPendingSubscriptionCheckout,
    onSuccess: () => {
      setSubscriptionCheckout(null);
      setIsSubscriptionCheckoutOpen(false);
      toast.success("Đã hủy thanh toán", {
        description: "Bạn có thể mua thẻ tháng lại.",
      });
    },
    onError: (error) => {
      setSubscriptionCheckout(null);
      setIsSubscriptionCheckoutOpen(false);
      toast.message("Đã đóng thanh toán", {
        description: getErrorMessage(error, "Có thể mua thẻ tháng lại."),
      });
    },
  });

  const handleBuyMonthlyCard = (vehicle: Vehicle) => {
    // BE gắn thẻ qua webhook vào vehicle.monthlyCardId — chỉ mua khi chưa có.
    if (vehicle.monthlyCardId) {
      toast.info("Xe này đã có thẻ tháng.");
      return;
    }

    const pendingCheckout = loadPendingSubscriptionCheckout(vehicle._id);
    if (pendingCheckout) {
      setSubscriptionCheckout(pendingCheckout);
      setIsSubscriptionCheckoutOpen(true);
      toast.message("Mở lại thanh toán thẻ tháng", {
        description: "Tiếp tục thanh toán PayOS cho xe này.",
      });
      return;
    }

    setSubscribingVehicleId(vehicle._id);
    subscribeMonthlyMutation.mutate(vehicle);
  };

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
  const changePasswordMutation = useMutation({
    mutationFn: changePassword,
    onSuccess: async (updatedUser) => {
      setChangePasswordError(null);
      setOldPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setChangePasswordError(null);
      setIsChangePasswordOpen(false);
      queryClient.setQueryData(myProfileQueryKey, updatedUser);
      await queryClient.invalidateQueries({ queryKey: myProfileQueryKey });
      setIsChangePasswordSuccessOpen(true);
    },
    onError: (error) => {
      const message = getChangePasswordErrorMessage(error);
      setChangePasswordError(message);
    },
  });
  const reserveSlotMutation = useMutation({
    mutationFn: createReservation,
    onSuccess: async (reservation) => {
      const reservationSlotId = getReservationSlotId(reservation);
      let reservedSlotLabel: string | undefined;
      if (reservationSlotId) {
        for (const floor of parkingFloorsQuery.data ?? []) {
          const slot = floor.slots?.find((item) => item._id === reservationSlotId);
          if (slot) {
            reservedSlotLabel = `${slot.slotNumber} · ${floor.floorName}`;
            break;
          }
        }
      }
      toast.success("Đặt chỗ thành công", {
        description: `${reservedSlotLabel ?? "Chỗ đã chọn"} đã được đặt thành công.`,
      });
      setIsReserveDialogOpen(false);
      setReservingVehicle(null);
      await invalidateDriverLiveData();
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
      await invalidateDriverLiveData();
    },
    onError: (error) => {
      toast.error("Không thể hủy đặt chỗ", {
        description: getErrorMessage(error, "Vui lòng thử lại."),
      });
    },
  });

  const parkingFloors = parkingFloorsQuery.data ?? emptyParkingFloors;
  const vehicleTypes = vehicleTypesQuery.data ?? emptyVehicleTypes;
  const vehicles = vehiclesQuery.data ?? emptyVehicles;
  const filteredVehicles = useMemo(() => {
    const query = vehiclePlateSearch.trim().toUpperCase();
    if (!query) {
      return vehicles;
    }
    return vehicles.filter((vehicle) => vehicle.licensePlate.toUpperCase().includes(query));
  }, [vehicles, vehiclePlateSearch]);
  const reservations = myReservationsQuery.data ?? emptyReservations;
  const sessionsByVehicleId = vehicleParkingSessionsQuery.data ?? new Map<string, ParkingSession>();
  const vehicleParkingSessions = useMemo(
    () => Array.from(sessionsByVehicleId.values()),
    [sessionsByVehicleId],
  );
  const sortedReservations = useMemo(
    () => sortReservationsByRecent(reservations),
    [reservations],
  );
  const reservationHistoryPagination = useMemo(
    () =>
      paginateItems(sortedReservations, reservationHistoryPage, RESERVATION_HISTORY_PAGE_SIZE),
    [sortedReservations, reservationHistoryPage],
  );
  const vehiclePagination = useMemo(
    () => paginateItems(filteredVehicles, vehiclePage, VEHICLE_PAGE_SIZE),
    [filteredVehicles, vehiclePage],
  );

  useEffect(() => {
    setReservationHistoryPage(1);
  }, [reservations.length]);

  useEffect(() => {
    setVehiclePage(1);
  }, [filteredVehicles.length, vehiclePlateSearch]);
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

      let slotStatus: string | undefined;
      for (const floor of parkingFloors) {
        const slot = floor.slots?.find((item) => item._id === slotId);
        if (slot) {
          slotStatus = slot.status;
          break;
        }
      }

      if (slotStatus === "CURRENTLY-IN-USED") {
        continue;
      }
      map.set(slotId, reservation);
    }
    return map;
  }, [myPendingReservations, parkingFloors]);
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

  const isVehicleTypeLoading = vehicleTypesQuery.isLoading && vehicleTypes.length === 0;

  useEffect(() => {
    const selectedTypeStillExists = vehicleTypes.some((type) => type._id === vehicleTypeId);
    if (vehicleTypes.length > 0 && (!vehicleTypeId || !selectedTypeStillExists)) {
      setVehicleTypeId(vehicleTypes[0]._id);
    }
  }, [vehicleTypeId, vehicleTypes]);

  const handleVehicleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setVehicleFormError(null);

    const normalizedPlate = licensePlate.trim().replace(/\s+/g, " ").toUpperCase();
    if (!normalizedPlate) {
      setVehicleFormError("Vui lòng nhập biển số.");
      return;
    }
    if (!LICENSE_PLATE_PATTERN.test(normalizedPlate)) {
      setVehicleFormError("Biển số phải đúng dạng 51A-123.45");
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
    if (!normalizedPlate) {
      setEditVehicleError("Vui lòng nhập biển số.");
      return;
    }
    if (!LICENSE_PLATE_PATTERN.test(normalizedPlate)) {
      setEditVehicleError("Biển số phải đúng dạng 51A-123.45");
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

  const handleVehicleFormOpenChange = (open: boolean) => {
    setIsVehicleFormOpen(open);
    if (open) {
      setVehicleFormError(null);
      if (vehicleTypes.length === 0 && !vehicleTypesQuery.isFetching) {
        void vehicleTypesQuery.refetch();
      }
    }
  };

  const resetChangePasswordForm = () => {
    setOldPassword("");
    setNewPassword("");
    setConfirmPassword("");
    setChangePasswordError(null);
  };

  const handleProfileOpenChange = (open: boolean) => {
    setIsProfileOpen(open);
    if (open) {
      void profileQuery.refetch();
    } else {
      resetChangePasswordForm();
      setIsChangePasswordOpen(false);
      //trong dialog có thể focus lại vào form change password, nên phải reset form
    }
  };

  const handleChangePasswordOpenChange = (open: boolean) => {
    setIsChangePasswordOpen(open);
    if (!open) {
      resetChangePasswordForm();
    }
  };

  const handleChangePasswordSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setChangePasswordError(null);

    if (!oldPassword.trim()) {
      setChangePasswordError("Vui lòng nhập mật khẩu hiện tại.");
      return;
    }
    if (oldPassword.length < 8) {
      setChangePasswordError("Mật khẩu hiện tại phải có ít nhất 8 kí tự.");
      return;
    }
    if (!newPassword.trim()) {
      setChangePasswordError("Vui lòng nhập mật khẩu mới.");
      return;
    }
    if (newPassword.length < 8) {
      setChangePasswordError("Mật khẩu mới phải có ít nhất 8 kí tự.");
      return;
    }
    if (!confirmPassword.trim()) {
      setChangePasswordError("Vui lòng xác nhận mật khẩu mới.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setChangePasswordError("Mật khẩu mới và xác nhận mật khẩu không khớp.");
      return;
    }
    if (newPassword === oldPassword) {
      setChangePasswordError("Mật khẩu mới phải khác mật khẩu hiện tại.");
      return;
    }

    changePasswordMutation.mutate({ oldPassword, newPassword });
  };

  const canSubmitChangePassword =
    oldPassword.trim().length >= 8 &&
    newPassword.length >= 8 &&
    confirmPassword.length >= 8 &&
    newPassword === confirmPassword &&
    newPassword !== oldPassword;

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

  const handleOpenReserveForVehicle = (vehicle: Vehicle) => {
    const blockReason = getVehicleReserveBlockReason(
      vehicle._id,
      vehicle.licensePlate,
      reservations,
      vehicleParkingSessions,
    );
    if (blockReason) {
      return;
    }

    setReservingVehicle(vehicle);
    setIsReserveDialogOpen(true);
  };

  const handleReserveFromDialog = (payload: {
    vehicleId: string;
    parkingSlotId: string;
    expectedArrival: string;
  }) => {
    reserveSlotMutation.mutate(payload);
  };

  const handleCancelReservationById = (reservationId: string) => {
    cancelReservationMutation.mutate(reservationId);
  };

  return (
    <div className="portal-shell portal-shell--driver min-h-screen">
      <SiteHeader />
      <DashboardMain wide>
        <DashboardSection>
          <div className="flex flex-wrap items-stretch justify-between gap-5">
            <button
              type="button"
              onClick={() => handleProfileOpenChange(true)}
              className="ui-profile-hero flex min-h-[5.5rem] min-w-0 flex-1 cursor-pointer items-center gap-4 p-4 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary sm:min-w-[280px]"
              aria-label="Xem hồ sơ"
            >
              <div className="relative">
                <div className="ui-profile-avatar grid size-20 place-items-center">
                  <UserRound className="size-10 text-muted-foreground" />
                </div>
                <span className="absolute bottom-1 right-1 size-3 rounded-full bg-status-empty ring-2 ring-card" />
              </div>

              <div className="min-w-0">
                <h1 className="truncate text-lg font-semibold tracking-tight md:text-xl">
                  {profile?.fullName ??
                    (profileQuery.isLoading ? "Đang tải hồ sơ..." : "Tài xế")}
                </h1>
                <p className="mt-1 font-mono text-[11px] uppercase tracking-[0.14em] text-status-empty">
                  {profile?.status ?? "ACTIVE"}
                </p>
              </div>
            </button>

            <div className="flex flex-wrap items-center gap-2 self-center">
              <Dialog open={isProfileOpen} onOpenChange={handleProfileOpenChange}>
                <DialogContent className="flex max-h-[85vh] flex-col gap-0 overflow-hidden rounded-2xl border-border/70 bg-card p-0 sm:max-w-lg">
                  <div className="api-dialog-head shrink-0 px-6 pb-4 pt-6">
                    <DialogHeader>
                      <DialogTitle>Hồ sơ của tôi</DialogTitle>
                      <DialogDescription>Thông tin tài khoản của tài xế hiện tại.</DialogDescription>
                    </DialogHeader>
                  </div>

                  <div className="min-h-0 flex-1 overflow-y-auto px-6 py-4">
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
                      <div className="space-y-6">
                        <div className="ui-dialog-summary">
                          <div className="ui-profile-avatar grid size-14 shrink-0 place-items-center">
                            <UserRound className="size-7 text-muted-foreground" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-base font-semibold">{profile.fullName}</p>
                            <div className="mt-2 flex flex-wrap gap-2">
                              <span className="rounded-full border border-primary/40 bg-primary/15 px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-primary">
                                {getProfileRoleName(profile)}
                              </span>
                              <span
                                className={`rounded-full border px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide ${
                                  profile.status === "ACTIVE"
                                    ? "border-status-empty/45 bg-status-empty/15 text-status-empty"
                                    : "border-border bg-muted text-muted-foreground"
                                }`}
                              >
                                {profile.status}
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="ui-detail-grid grid gap-4 p-4">
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
                            <div className="grid gap-2 sm:col-span-2">
                              <Label htmlFor="profile-email">Email</Label>
                              <div className="relative min-w-0">
                                <div className="ui-field-icon pointer-events-none absolute left-2 top-1/2 size-7 -translate-y-1/2">
                                  <Mail className="size-3.5" />
                                </div>
                                <div
                                  id="profile-email"
                                  className="flex min-h-11 w-full min-w-0 items-center rounded-xl border border-border/70 bg-secondary/45 py-2 pl-11 pr-3 text-sm break-all text-foreground"
                                  title={profile.email}
                                >
                                  {profile.email}
                                </div>
                              </div>
                            </div>

                            <div className="grid gap-2">
                              <Label htmlFor="profile-phone">Số điện thoại</Label>
                              <div className="relative">
                                <div className="ui-field-icon pointer-events-none absolute left-2 top-1/2 size-7 -translate-y-1/2">
                                  <Phone className="size-3.5" />
                                </div>
                                <Input
                                  id="profile-phone"
                                  value={profile.phone}
                                  className="h-11 rounded-xl pl-11"
                                  readOnly
                                />
                              </div>
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
                        </div>

                        <div className="border-t border-border pt-4">
                          <Button
                            type="button"
                            variant="secondary"
                            onClick={() => setIsChangePasswordOpen(true)}
                            className="h-11 rounded-xl px-4 text-[13px] font-semibold"
                          >
                            Đổi mật khẩu
                          </Button>
                        </div>
                      </div>
                    ) : null}
                  </div>
                </DialogContent>
              </Dialog>

              <Dialog open={isChangePasswordOpen} onOpenChange={handleChangePasswordOpenChange}>
                <DialogContent className="flex max-h-[85vh] flex-col gap-0 overflow-hidden rounded-2xl border-border/70 bg-card p-0 sm:max-w-md">
                  <div className="api-dialog-head shrink-0 px-6 pb-4 pt-6">
                    <DialogHeader>
                      <DialogTitle>Đổi mật khẩu</DialogTitle>
                      <DialogDescription>
                        Nhập mật khẩu hiện tại và mật khẩu mới để cập nhật.
                      </DialogDescription>
                    </DialogHeader>
                  </div>

                  <form onSubmit={handleChangePasswordSubmit} className="grid gap-4 px-6 py-4">
                    <div className="grid gap-2">
                      <Label htmlFor="profile-old-password">Mật khẩu hiện tại</Label>
                      <Input
                        id="profile-old-password"
                        type="password"
                        value={oldPassword}
                        onChange={(event) => setOldPassword(event.target.value)}
                        className="h-11 rounded-xl"
                        autoComplete="current-password"
                        required
                        minLength={8}
                      />
                    </div>

                    <div className="grid gap-2">
                      <Label htmlFor="profile-new-password">Mật khẩu mới</Label>
                      <Input
                        id="profile-new-password"
                        type="password"
                        value={newPassword}
                        onChange={(event) => setNewPassword(event.target.value)}
                        className="h-11 rounded-xl"
                        autoComplete="new-password"
                        required
                        minLength={8}
                      />
                    </div>

                    <div className="grid gap-2">
                      <Label htmlFor="profile-confirm-password">Xác nhận mật khẩu mới</Label>
                      <Input
                        id="profile-confirm-password"
                        type="password"
                        value={confirmPassword}
                        onChange={(event) => setConfirmPassword(event.target.value)}
                        className="h-11 rounded-xl"
                        autoComplete="new-password"
                        required
                        minLength={8}
                      />
                      {confirmPassword && newPassword !== confirmPassword ? (
                        <p className="text-xs text-destructive">Mật khẩu xác nhận chưa khớp.</p>
                      ) : null}
                    </div>

                    {changePasswordError ? (
                      <div className="rounded-xl border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                        {changePasswordError}
                      </div>
                    ) : null}

                    <div className="flex justify-end gap-2">
                      <Button
                        type="button"
                        variant="secondary"
                        onClick={() => handleChangePasswordOpenChange(false)}
                        disabled={changePasswordMutation.isPending}
                        className="h-11 rounded-xl px-4"
                      >
                        Hủy
                      </Button>
                      <Button
                        type="submit"
                        disabled={changePasswordMutation.isPending || !canSubmitChangePassword}
                        className="h-11 rounded-xl px-4 text-[13px] font-semibold"
                      >
                        {changePasswordMutation.isPending ? (
                          <>
                            <LoaderCircle className="size-4 animate-spin" />
                            Đang đổi...
                          </>
                        ) : (
                          "Lưu mật khẩu"
                        )}
                      </Button>
                    </div>
                  </form>
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
                <DialogContent className="flex max-h-[85vh] flex-col gap-0 overflow-hidden rounded-2xl border-border/70 bg-card p-0 sm:max-w-md">
                  <div className="api-dialog-head shrink-0 px-6 pb-4 pt-6">
                    <DialogHeader>
                      <DialogTitle>Sửa hồ sơ</DialogTitle>
                      <DialogDescription>Cập nhật họ tên và số điện thoại của bạn.</DialogDescription>
                    </DialogHeader>
                  </div>

                  <form onSubmit={handleEditProfileSubmit} className="grid gap-4 px-6 py-4">
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

        <DashboardSection>
          <DashboardTabs tabs={driverTabs} activeTab={activeTab} onChange={setActiveTab} />

          {activeTab === "manage" ? (
            <DriverVehiclesReservationsPanel
              vehicles={filteredVehicles}
              vehicleTypes={vehicleTypes}
              reservations={reservations}
              vehiclePagination={vehiclePagination}
              sessionsByVehicleId={sessionsByVehicleId}
              vehicleParkingSessions={vehicleParkingSessions}
              isVehiclesLoading={vehiclesQuery.isLoading}
              vehicleListError={vehicleListError}
              isVehicleTypeLoading={isVehicleTypeLoading}
              vehicleTypeError={vehicleTypeError}
              licensePlate={licensePlate}
              vehicleTypeId={vehicleTypeId}
              vehicleFormError={vehicleFormError}
              isVehicleFormOpen={isVehicleFormOpen}
              isCreateVehiclePending={createVehicleMutation.isPending}
              deletingVehicleId={deletingVehicleId}
              subscribingVehicleId={subscribingVehicleId}
              vehiclePlateSearch={vehiclePlateSearch}
              totalVehicleCount={vehicles.length}
              onVehiclePlateSearchChange={setVehiclePlateSearch}
              onVehiclePageChange={setVehiclePage}
              onVehicleFormOpenChange={handleVehicleFormOpenChange}
              onLicensePlateChange={setLicensePlate}
              onVehicleTypeIdChange={setVehicleTypeId}
              onVehicleSubmit={handleVehicleSubmit}
              onReserveVehicle={handleOpenReserveForVehicle}
              onBuyMonthlyCard={handleBuyMonthlyCard}
              onEditVehicle={handleStartEditVehicle}
              onDeleteVehicle={handleDeleteVehicle}
            />
          ) : null}

          {activeTab === "reservations" ? (
            <DriverReservationsHistoryPanel
              reservations={sortedReservations}
              reservationPagination={reservationHistoryPagination}
              sessionsByVehicleId={sessionsByVehicleId}
              reservationBySlotId={reservationBySlotId}
              isLoading={myReservationsQuery.isLoading}
              error={myReservationsError}
              isCancelPending={cancelReservationMutation.isPending}
              onReservationPageChange={setReservationHistoryPage}
              onViewReservation={setViewingHistoryReservation}
              onCancelReservation={handleCancelReservationById}
            />
          ) : null}
        </DashboardSection>

        <Dialog open={isEditVehicleOpen} onOpenChange={handleEditVehicleOpenChange}>
            <DialogContent className="flex max-h-[85vh] flex-col gap-0 overflow-hidden rounded-2xl border-border/70 bg-card p-0 sm:max-w-md">
              <div className="api-dialog-head shrink-0 px-6 pb-4 pt-6">
                <DialogHeader>
                  <DialogTitle>Sửa xe</DialogTitle>
                  <DialogDescription>Cập nhật biển số hoặc loại xe.</DialogDescription>
                </DialogHeader>
              </div>

              <form onSubmit={handleEditVehicleSubmit} className="space-y-4 px-6 py-4">
                <div className="ui-form-panel space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="ui-field-icon size-10">
                      <CarFront className="size-5" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold">Thông tin xe</p>
                      <p className="text-xs text-muted-foreground">Cập nhật biển số và loại xe đã đăng ký.</p>
                    </div>
                  </div>

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
                      placeholder="51A-123.45"
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
      </DashboardMain>

      <DriverSubscriptionCheckoutDialog
        open={isSubscriptionCheckoutOpen}
        onOpenChange={setIsSubscriptionCheckoutOpen}
        checkout={subscriptionCheckout}
        isCancelling={cancelSubscriptionCheckoutMutation.isPending}
        onOpenPayOs={() => {
          if (!subscriptionCheckout?.checkoutUrl) {
            return;
          }
          window.open(subscriptionCheckout.checkoutUrl, "_blank", "noopener,noreferrer");
        }}
        onCancelCheckout={() => {
          cancelSubscriptionCheckoutMutation.mutate(subscriptionCheckout);
        }}
      />

      <DriverVehicleReserveDialog
        open={isReserveDialogOpen}
        onOpenChange={(open) => {
          setIsReserveDialogOpen(open);
          if (!open) {
            setReservingVehicle(null);
          }
        }}
        vehicle={reservingVehicle}
        vehicleTypes={vehicleTypes}
        parkingFloors={parkingFloors}
        reservations={reservations}
        vehicleParkingSessions={vehicleParkingSessions}
        isSubmitting={reserveSlotMutation.isPending}
        onReserve={handleReserveFromDialog}
      />

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
      <AlertDialog open={isChangePasswordSuccessOpen} onOpenChange={setIsChangePasswordSuccessOpen}>
        <AlertDialogContent className="rounded-2xl border-border bg-card">
          <AlertDialogHeader>
            <AlertDialogTitle>Đổi mật khẩu thành công</AlertDialogTitle>
            <AlertDialogDescription>
              Mật khẩu của bạn đã được cập nhật. Hãy dùng mật khẩu mới cho lần đăng nhập sau.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction className="rounded-xl">Đã hiểu</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <DriverChatbotWidget />
    </div>
  );
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

function getChangePasswordErrorMessage(error: unknown) {
  if (error instanceof UserApiError) {
    if (error.message.toLowerCase().includes("old password")) {
      return "Mật khẩu hiện tại không đúng.";
    }
    return error.message || "Không thể đổi mật khẩu.";
  }
  return getErrorMessage(error, "Không thể đổi mật khẩu.");
}
