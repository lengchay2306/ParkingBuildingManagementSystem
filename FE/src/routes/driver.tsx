import { useEffect, useMemo, useRef, useState, type ComponentPropsWithoutRef, type FormEvent } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  CalendarDays,
  CarFront,
  ChevronDown,
  LoaderCircle,
  Mail,
  MapPin,
  Pencil,
  Phone,
  Plus,
  RefreshCw,
  Save,
  UserRound,
} from "lucide-react";
import { toast } from "sonner";

import { DriverVehicleReserveDialog } from "@/components/driver/DriverVehicleReserveDialog";
import {
  DriverVehicleCard,
  findPendingReservationForVehicle,
} from "@/components/driver/DriverVehicleCard";
import { SiteHeader } from "@/components/SiteHeader";
import { DriverChatbotWidget } from "@/components/chatbot/DriverChatbotWidget";
import { ReservationDetailDialog } from "@/components/ReservationDetailDialog";
import {
  DashboardClientPagination,
  DashboardMain,
  DashboardSection,
  DashboardSectionHeader,
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
  getParkingSessionSlotId,
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

const reservedByYouBadgeStyle =
  "border-status-yours/45 bg-status-yours/15 text-status-yours";

const vehicleTypesQueryKey = ["vehicle-types"] as const;
const myVehiclesQueryKey = ["my-vehicles"] as const;
const myProfileQueryKey = ["my-profile"] as const;
const parkingFloorsQueryKey = ["parking-floors"] as const;
const myReservationsQueryKey = ["my-reservations"] as const;
const myVehicleParkingSessionsQueryKey = ["my-vehicle-parking-sessions"] as const;
const emptyVehicleTypes: VehicleType[] = [];
const emptyVehicles: Vehicle[] = [];
const emptyParkingFloors: ParkingFloor[] = [];
const emptyReservations: Reservation[] = [];
const RESERVATION_HISTORY_PAGE_SIZE = 5;
const VEHICLE_PAGE_SIZE = 5;

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
  const [isVehiclesExpanded, setIsVehiclesExpanded] = useState(true);
  const [reservationHistoryDate, setReservationHistoryDate] = useState(() => getLocalDateInputValue());
  const [reservationHistoryPage, setReservationHistoryPage] = useState(1);
  const [vehiclePage, setVehiclePage] = useState(1);
  const [viewingHistoryReservation, setViewingHistoryReservation] = useState<Reservation | null>(null);
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

  const subscribeMonthlyMutation = useMutation({
    mutationFn: createSubscriptionCheckoutLink,
    onSuccess: ({ checkoutUrl }) => {
      toast.success("Đang chuyển tới PayOS...", {
        description: "Hoàn tất thanh toán thẻ tháng trên trang PayOS.",
      });
      window.location.href = checkoutUrl;
    },
    onError: (error) => {
      setSubscribingVehicleId(null);
      toast.error("Không thể tạo link thanh toán", {
        description: getErrorMessage(error, "Vui lòng thử lại."),
      });
    },
  });

  const handleBuyMonthlyCard = (vehicle: Vehicle) => {
    // BE gắn thẻ qua webhook vào vehicle.monthlyCardId — chỉ mua khi chưa có.
    if (vehicle.monthlyCardId) {
      toast.info("Xe này đã có thẻ tháng.");
      return;
    }
    setSubscribingVehicleId(vehicle._id);
    subscribeMonthlyMutation.mutate(vehicle._id);
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
  const vehicleTypes = vehicleTypesQuery.data ?? emptyVehicleTypes;
  const vehicles = vehiclesQuery.data ?? emptyVehicles;
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
  const reservationHistoryPagination = useMemo(
    () =>
      paginateItems(
        filteredHistoryReservations,
        reservationHistoryPage,
        RESERVATION_HISTORY_PAGE_SIZE,
      ),
    [filteredHistoryReservations, reservationHistoryPage],
  );
  const vehiclePagination = useMemo(
    () => paginateItems(vehicles, vehiclePage, VEHICLE_PAGE_SIZE),
    [vehicles, vehiclePage],
  );

  useEffect(() => {
    setReservationHistoryPage(1);
  }, [reservationHistoryDate]);

  useEffect(() => {
    setVehiclePage(1);
  }, [vehicles.length]);
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
                            <div className="grid gap-2">
                              <Label htmlFor="profile-email">Email</Label>
                              <div className="relative">
                                <div className="ui-field-icon pointer-events-none absolute left-2 top-1/2 size-7 -translate-y-1/2">
                                  <Mail className="size-3.5" />
                                </div>
                                <Input
                                  id="profile-email"
                                  value={profile.email}
                                  className="h-11 rounded-xl pl-11"
                                  readOnly
                                />
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
                className="inline-flex size-9 items-center justify-center rounded-xl border border-primary/30 bg-primary/10 text-primary transition-all hover:-translate-y-px hover:bg-primary/18 disabled:cursor-not-allowed disabled:opacity-50"
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
                <DialogContent className="flex max-h-[85vh] flex-col gap-0 overflow-hidden rounded-2xl border-border/70 bg-card p-0 sm:max-w-md">
                  <div className="api-dialog-head shrink-0 px-6 pb-4 pt-6">
                    <DialogHeader>
                      <DialogTitle>Thêm xe mới</DialogTitle>
                      <DialogDescription>
                        Nhập biển số và loại xe để đăng ký vào tài khoản của bạn.
                      </DialogDescription>
                    </DialogHeader>
                  </div>

                  <form onSubmit={handleVehicleSubmit} className="space-y-4 px-6 py-4">
                    <div className="ui-form-panel space-y-4">
                      <div className="flex items-center gap-3">
                        <div className="ui-field-icon size-10">
                          <CarFront className="size-5" />
                        </div>
                        <div>
                          <p className="text-sm font-semibold">Đăng ký xe mới</p>
                          <p className="text-xs text-muted-foreground">Nhập biển số và chọn loại xe phù hợp.</p>
                        </div>
                      </div>

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
            <div className="driver-vehicle-list mt-4 space-y-3">
            {vehiclesQuery.isLoading ? (
              <div className="flex items-center gap-2 rounded-2xl border border-border/70 bg-card/60 p-4 text-sm text-muted-foreground">
                <LoaderCircle className="size-4 animate-spin" />
                Đang tải xe của bạn...
              </div>
            ) : vehicleListError ? (
              <div className="rounded-2xl border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">
                {vehicleListError}
              </div>
            ) : vehicles.length > 0 ? (
              <>
              {vehiclePagination.items.map((vehicle) => (
                <DriverVehicleCard
                  key={vehicle._id}
                  vehicle={vehicle}
                  vehicleTypes={vehicleTypes}
                  pendingReservation={findPendingReservationForVehicle(vehicle._id, reservations)}
                  parkingSession={sessionsByVehicleId.get(vehicle._id) ?? null}
                  reservations={reservations}
                  vehicleParkingSessions={vehicleParkingSessions}
                  isDeleting={deletingVehicleId === vehicle._id}
                  isSubscribing={
                    subscribeMonthlyMutation.isPending && subscribingVehicleId === vehicle._id
                  }
                  onReserve={() => handleOpenReserveForVehicle(vehicle)}
                  onBuyMonthlyCard={() => handleBuyMonthlyCard(vehicle)}
                  onEdit={() => handleStartEditVehicle(vehicle)}
                  onDelete={() => handleDeleteVehicle(vehicle)}
                />
              ))}
              <DashboardClientPagination
                page={vehiclePagination.page}
                totalPages={vehiclePagination.totalPages}
                totalItems={vehiclePagination.totalItems}
                onPageChange={setVehiclePage}
                disabled={vehiclesQuery.isFetching}
              />
              </>
            ) : (
              <div className="rounded-2xl border border-border/70 bg-card/60 p-4 text-sm text-muted-foreground">
                Bạn chưa có xe nào. Bấm &quot;Thêm xe&quot; để đăng ký biển số.
              </div>
            )}
            </div>
          ) : null}
        </DashboardSection>

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

            <div className="mt-4 flex flex-wrap items-end gap-3 ui-filter-row">
              <div className="space-y-2">
                <Label htmlFor="reservation-history-date">Ngày</Label>
                <div className="relative">
                  <CalendarDays className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-primary" />
                  <Input
                    id="reservation-history-date"
                    type="date"
                    value={reservationHistoryDate}
                    onChange={(event) => setReservationHistoryDate(event.target.value)}
                    className="h-10 w-full min-w-[180px] rounded-xl pr-10 sm:w-auto"
                  />
                </div>
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
              <div className="api-empty mt-4 flex items-center gap-2 px-4 py-3 text-sm text-muted-foreground">
                <LoaderCircle className="size-4 animate-spin text-primary" />
                Đang tải đặt chỗ...
              </div>
            ) : myReservationsError ? (
              <div className="mt-4 rounded-2xl border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                {myReservationsError}
              </div>
            ) : filteredHistoryReservations.length > 0 ? (
              <div className="mt-4 space-y-3">
                {reservationHistoryPagination.items.map((reservation) => {
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
                      className="ui-reservation-card w-full cursor-pointer p-4 text-left"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="flex min-w-0 items-start gap-3">
                          <div className="ui-slot-chip size-11 shrink-0">
                            <MapPin className="size-5" />
                          </div>
                          <div className="min-w-0">
                            <p className="font-mono text-sm font-semibold">
                              {getReservationSlotLabel(reservation)}
                            </p>
                            <p className="mt-0.5 text-xs text-muted-foreground">
                              Xe: {getReservationVehicleLabel(reservation) ?? "Không có"}
                            </p>
                          </div>
                        </div>
                        <span
                          className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${getReservationStatusBadge(displayStatus)}`}
                        >
                          {getReservationStatusLabel(displayStatus)}
                        </span>
                      </div>

                      <div className="mt-3 grid gap-2 rounded-lg border border-primary/15 bg-primary/5 px-3 py-2 text-xs text-muted-foreground sm:grid-cols-2">
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
                <DashboardClientPagination
                  page={reservationHistoryPagination.page}
                  totalPages={reservationHistoryPagination.totalPages}
                  totalItems={reservationHistoryPagination.totalItems}
                  onPageChange={setReservationHistoryPage}
                  disabled={myReservationsQuery.isFetching}
                />
              </div>
            ) : (
              <div className="api-empty mt-4 px-4 py-8 text-center text-sm text-muted-foreground">
                Không có đặt chỗ nào vào {formatReservationHistoryDateLabel(reservationHistoryDate)}.
              </div>
            )}
        </DashboardSection>
      </DashboardMain>

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

function getChangePasswordErrorMessage(error: unknown) {
  if (error instanceof UserApiError) {
    if (error.message.toLowerCase().includes("old password")) {
      return "Mật khẩu hiện tại không đúng.";
    }
    return error.message || "Không thể đổi mật khẩu.";
  }
  return getErrorMessage(error, "Không thể đổi mật khẩu.");
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
