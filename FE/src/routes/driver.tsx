import { useEffect, useMemo, useState, type FormEvent } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { LucideIcon } from "lucide-react";
import {
  CarFront,
  CheckCircle2,
  CircleDashed,
  Clock3,
  CreditCard,
  LoaderCircle,
  Mail,
  MapPin,
  MessageSquareWarning,
  Pencil,
  Phone,
  Plus,
  RefreshCw,
  Save,
  Search,
  ShieldCheck,
  Timer,
  UserRound,
  Wallet,
} from "lucide-react";
import { toast } from "sonner";

import { SiteHeader } from "@/components/SiteHeader";
import { SlotAvailabilityFilter } from "@/components/SlotAvailabilityFilter";
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
import { requireRole } from "@/lib/auth";
import {
  createVehicle,
  getVehicleByLicensePlate,
  getMyVehicles,
  getVehicleTypes,
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
      { title: "Driver Portal - PARKOS" },
      {
        name: "description",
        content:
          "Driver portal to view parking information, reserve slots, track active sessions, make payments, and submit feedback or incident reports.",
      },
      { property: "og:title", content: "Driver Portal - PARKOS" },
      {
        property: "og:description",
        content:
          "View parking status in real time, reserve supported slots, track active parking sessions, pay, and report issues.",
      },
    ],
  }),
  component: DriverPage,
});

type SpotStatus = "available" | "occupied" | "reserved";

type ParkingSpot = {
  id: string;
  status: SpotStatus;
  ev?: boolean;
  activeSession?: boolean;
  holdUntil?: string;
};

type ParkingRow = {
  label: string;
  spots: ParkingSpot[];
};

type QuickAction = {
  title: string;
  description: string;
  cta: string;
  icon: LucideIcon;
  highlighted?: boolean;
};

const quickActions: QuickAction[] = [
  {
    title: "Reserve Parking Slot",
    description: "Book in advance when reservation is supported at this facility.",
    cta: "Open reservation",
    icon: MapPin,
    highlighted: true,
  },
  {
    title: "Track Active Session",
    description: "Monitor timer, fee estimate, and current level in real time.",
    cta: "View live session",
    icon: Timer,
  },
  {
    title: "Make Payment",
    description: "Pay with wallet or card and download parking receipts.",
    cta: "Pay now",
    icon: CreditCard,
  },
  {
    title: "Feedback and Incident",
    description: "Submit issue reports for wrong-slot, gate, or billing incidents.",
    cta: "Create report",
    icon: MessageSquareWarning,
  },
];

const parkingRows: ParkingRow[] = [
  {
    label: "ROW-A",
    spots: [
      { id: "A01", status: "available", ev: true },
      { id: "A02", status: "occupied" },
      { id: "A03", status: "available", ev: true },
      { id: "A04", status: "available", ev: true },
      { id: "A05", status: "occupied" },
      { id: "A06", status: "available" },
    ],
  },
  {
    label: "ROW-B",
    spots: [
      { id: "B07", status: "available" },
      { id: "B08", status: "occupied" },
      { id: "B09", status: "occupied" },
      { id: "B10", status: "available" },
      { id: "B11", status: "available" },
      { id: "B12", status: "occupied" },
    ],
  },
  {
    label: "ROW-C",
    spots: [
      { id: "C13", status: "available" },
      { id: "C14", status: "available" },
      { id: "C15", status: "occupied" },
      { id: "C16", status: "available" },
      { id: "C17", status: "available" },
      { id: "C18", status: "reserved", holdUntil: "08:42 PM", activeSession: true },
    ],
  },
];

const spotStyles: Record<SpotStatus, string> = {
  available:
    "border-status-empty/40 bg-status-empty/10 text-status-empty hover:border-status-empty/70",
  occupied: "border-border bg-background/55 text-muted-foreground hover:border-border/90",
  reserved:
    "border-status-reserved/45 bg-status-reserved/12 text-status-reserved hover:border-status-reserved/70",
};

const statusText: Record<SpotStatus, string> = {
  available: "Available",
  occupied: "Occupied",
  reserved: "Reserved",
};

const statusBadge: Record<SpotStatus, string> = {
  available: "bg-status-empty/20 text-status-empty border-status-empty/40",
  occupied: "bg-muted text-muted-foreground border-border",
  reserved: "bg-status-reserved/20 text-status-reserved border-status-reserved/45",
};

const vehicleTypesQueryKey = ["vehicle-types"] as const;
const myVehiclesQueryKey = ["my-vehicles"] as const;
const myProfileQueryKey = ["my-profile"] as const;
const emptyVehicleTypes: VehicleType[] = [];
const emptyVehicles: Vehicle[] = [];

function DriverPage() {
  const queryClient = useQueryClient();
  const [selectedSpotId, setSelectedSpotId] = useState<string | null>(null);
  const [licensePlate, setLicensePlate] = useState("");
  const [vehicleTypeId, setVehicleTypeId] = useState("");
  const [vehicleFormError, setVehicleFormError] = useState<string | null>(null);
  const [isVehicleFormOpen, setIsVehicleFormOpen] = useState(false);
  const [lookupPlate, setLookupPlate] = useState("");
  const [lookupVehicle, setLookupVehicle] = useState<Vehicle | null>(null);
  const [lookupError, setLookupError] = useState<string | null>(null);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isEditProfileOpen, setIsEditProfileOpen] = useState(false);
  const [editFullName, setEditFullName] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editProfileError, setEditProfileError] = useState<string | null>(null);
  const canFetchVehicles = typeof window !== "undefined";

  const profileQuery = useQuery({
    queryKey: myProfileQueryKey,
    queryFn: getMyProfile,
    enabled: canFetchVehicles,
  });
  const vehicleTypesQuery = useQuery({
    queryKey: vehicleTypesQueryKey,
    queryFn: getVehicleTypes,
    enabled: canFetchVehicles,
  });
  const vehiclesQuery = useQuery({
    queryKey: myVehiclesQueryKey,
    queryFn: getMyVehicles,
    enabled: canFetchVehicles,
  });

  const createVehicleMutation = useMutation({
    mutationFn: createVehicle,
    onSuccess: async (vehicle) => {
      setLicensePlate("");
      setVehicleFormError(null);
      setIsVehicleFormOpen(false);
      toast.success("Vehicle registered", {
        description: `${vehicle.licensePlate} has been added to your account.`,
      });
      await queryClient.invalidateQueries({ queryKey: myVehiclesQueryKey });
    },
    onError: (error) => {
      setVehicleFormError(getErrorMessage(error, "Unable to register vehicle."));
    },
  });
  const lookupVehicleMutation = useMutation({
    mutationFn: getVehicleByLicensePlate,
    onSuccess: (vehicle) => {
      setLookupVehicle(vehicle);
      setLookupError(null);
    },
    onError: (error) => {
      setLookupVehicle(null);
      setLookupError(getErrorMessage(error, "Vehicle not found."));
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
      setEditProfileError(getErrorMessage(error, "Không thể cập nhật hồ sơ."));
    },
  });

  const allSpots = useMemo(() => parkingRows.flatMap((row) => row.spots), []);
  const selectedSpot = useMemo(
    () => allSpots.find((spot) => spot.id === selectedSpotId) ?? null,
    [allSpots, selectedSpotId],
  );
  const vehicleTypes = vehicleTypesQuery.data ?? emptyVehicleTypes;
  const vehicles = vehiclesQuery.data ?? emptyVehicles;
  const profile = profileQuery.data ?? null;
  const primaryVehicle = vehicles[0] ?? null;
  const primaryVehicleType = primaryVehicle
    ? getVehicleTypeName(primaryVehicle, vehicleTypes)
    : null;

  const availableCount = allSpots.filter((spot) => spot.status === "available").length;
  const occupiedCount = allSpots.filter((spot) => spot.status === "occupied").length;
  const reservedCount = allSpots.filter((spot) => spot.status === "reserved").length;

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
      setVehicleFormError("Enter a valid license plate.");
      return;
    }
    if (!vehicleTypeId || vehicleTypes.length === 0) {
      setVehicleFormError(
        vehicleTypes.length === 0
          ? "Vehicle types are not available from backend yet. Refresh vehicle types and try again."
          : "Choose a vehicle type.",
      );
      return;
    }

    createVehicleMutation.mutate({
      licensePlate: normalizedPlate,
      vehicleTypeId,
    });
  };

  const handleVehicleLookupSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLookupError(null);

    const normalizedPlate = lookupPlate.trim().replace(/\s+/g, " ").toUpperCase();
    if (normalizedPlate.length < 4) {
      setLookupVehicle(null);
      setLookupError("Enter a valid license plate to search.");
      return;
    }

    setLookupPlate(normalizedPlate);
    lookupVehicleMutation.mutate(normalizedPlate);
  };

  const vehicleListError = vehiclesQuery.error
    ? getErrorMessage(vehiclesQuery.error, "Unable to load registered vehicles.")
    : null;
  const vehicleTypeError = vehicleTypesQuery.error
    ? getErrorMessage(vehicleTypesQuery.error, "Unable to load vehicle types.")
    : null;
  const profileError = profileQuery.error
    ? getErrorMessage(profileQuery.error, "Unable to load profile.")
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

  return (
    <div className="min-h-screen">
      <SiteHeader />
      <main className="mx-auto w-full max-w-[1320px] px-4 pb-12 pt-6 md:px-6">
        <section className="rounded-3xl border border-border/75 bg-card/75 p-5 shadow-soft md:p-8">
          <div className="flex flex-wrap items-start justify-between gap-5">
            <div className="flex min-w-0 items-center gap-4">
              <div className="relative">
                <div className="grid size-20 place-items-center rounded-full border border-border bg-background/80">
                  <UserRound className="size-10 text-muted-foreground" />
                </div>
                <span className="absolute bottom-1 right-1 size-3 rounded-full bg-status-empty ring-2 ring-background" />
              </div>

              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="truncate text-2xl font-semibold tracking-tight">
                    {profile?.fullName ??
                      (profileQuery.isLoading ? "Loading profile..." : "Driver")}
                  </h1>
                  <span className="rounded-md border border-primary/40 bg-primary/12 px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.15em] text-primary">
                    {profile ? `${getProfileRoleName(profile)} active` : "Driver active"}
                  </span>
                </div>
                <p className="mt-1 text-sm text-muted-foreground">
                  {profile?.email ?? "Profile email unavailable"}
                </p>
                <div className="mt-3 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                  <span className="inline-flex items-center gap-1.5">
                    <CarFront className="size-4" />
                    {primaryVehicle ? `${primaryVehicleType} Standard` : "No registered vehicle"}
                  </span>
                  <span className="text-border">|</span>
                  <span className="font-mono tracking-wide">
                    Plate: {primaryVehicle?.licensePlate ?? "Not registered"}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
            <Dialog open={isProfileOpen} onOpenChange={handleProfileOpenChange}>
              <DialogTrigger asChild>
                <button
                  type="button"
                  className="inline-flex items-center gap-2 rounded-xl border border-border bg-background/70 px-4 py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
                >
                  <UserRound className="size-4" />
                  View profile
                </button>
              </DialogTrigger>
              <DialogContent className="rounded-2xl border-border bg-card sm:max-w-lg">
                <DialogHeader>
                  <DialogTitle>My profile</DialogTitle>
                  <DialogDescription>Account details for the current driver.</DialogDescription>
                </DialogHeader>

                {profileQuery.isLoading ? (
                  <div className="flex items-center gap-2 rounded-xl border border-border bg-background/45 px-3 py-3 text-sm text-muted-foreground">
                    <LoaderCircle className="size-4 animate-spin" />
                    Loading profile...
                  </div>
                ) : profileError ? (
                  <div className="rounded-xl border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                    {profileError}
                  </div>
                ) : profile ? (
                  <form className="grid gap-4">
                    <div className="grid gap-2">
                      <Label htmlFor="profile-full-name">Full name</Label>
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
                        <Label htmlFor="profile-phone">Phone</Label>
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
                        <Label htmlFor="profile-role">Role</Label>
                        <Input
                          id="profile-role"
                          value={getProfileRoleName(profile)}
                          className="h-11 rounded-xl"
                          readOnly
                        />
                      </div>

                      <div className="grid gap-2">
                        <Label htmlFor="profile-status">Status</Label>
                        <Input
                          id="profile-status"
                          value={profile.status}
                          className="h-11 rounded-xl"
                          readOnly
                        />
                      </div>
                    </div>

                    <div className="grid gap-2">
                      <Label htmlFor="profile-created-at">Created at</Label>
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
                  Edit profile
                </Button>
              </DialogTrigger>
              <DialogContent className="rounded-2xl border-border bg-card sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>Edit profile</DialogTitle>
                  <DialogDescription>
                    Cập nhật họ tên và số điện thoại của bạn.
                  </DialogDescription>
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

          <div className="mt-6 grid gap-3 sm:grid-cols-3">
            <InfoStat
              label="Available spots"
              value={`${availableCount}`}
              tone="text-status-empty"
            />
            <InfoStat label="Active parking session" value="01:42:15" tone="text-foreground" />
            <InfoStat label="Estimated fee" value="$8.50" tone="text-primary" />
          </div>
        </section>

        <section className="mt-6 rounded-3xl border border-border/75 bg-card/70 p-5 shadow-soft md:p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                Vehicle registry
              </p>
              <h2 className="mt-2 text-2xl font-semibold tracking-tight">My registered vehicles</h2>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                aria-label="Refresh registered vehicles"
                onClick={() => void vehiclesQuery.refetch()}
                disabled={vehiclesQuery.isFetching}
                className="inline-flex size-9 items-center justify-center rounded-xl border border-border bg-background/55 text-muted-foreground transition-colors hover:text-foreground disabled:cursor-not-allowed disabled:opacity-50"
              >
                <RefreshCw className={`size-4 ${vehiclesQuery.isFetching ? "animate-spin" : ""}`} />
              </button>

              <Dialog open={isVehicleFormOpen} onOpenChange={handleVehicleFormOpenChange}>
                <DialogTrigger asChild>
                  <Button type="button" className="h-9 rounded-xl px-4 text-[13px] font-semibold">
                    <Plus className="size-4" />
                    Register vehicle
                  </Button>
                </DialogTrigger>
                <DialogContent className="rounded-2xl border-border bg-card sm:max-w-md">
                  <DialogHeader>
                    <DialogTitle>Register vehicle</DialogTitle>
                    <DialogDescription>
                      Add a license plate and vehicle type to your account.
                    </DialogDescription>
                  </DialogHeader>

                  <form onSubmit={handleVehicleSubmit} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="vehicle-license-plate">License plate</Label>
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
                      <Label htmlFor="vehicle-type">Vehicle type</Label>
                      <Select
                        value={vehicleTypeId}
                        onValueChange={setVehicleTypeId}
                        disabled={isVehicleTypeLoading}
                      >
                        <SelectTrigger id="vehicle-type" className="h-11 rounded-xl">
                          <SelectValue
                            placeholder={isVehicleTypeLoading ? "Loading types..." : "Select type"}
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
                        Refresh vehicle types
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
                          Registering...
                        </>
                      ) : (
                        <>
                          <Plus className="size-4" />
                          Register vehicle
                        </>
                      )}
                    </Button>
                  </form>
                </DialogContent>
              </Dialog>
            </div>
          </div>

          <form
            onSubmit={handleVehicleLookupSubmit}
            className="mt-5 grid gap-3 rounded-2xl border border-border bg-background/35 p-3 md:grid-cols-[minmax(0,1fr)_auto]"
          >
            <div className="min-w-0">
              <Label htmlFor="vehicle-lookup-plate" className="sr-only">
                Search vehicle by license plate
              </Label>
              <Input
                id="vehicle-lookup-plate"
                value={lookupPlate}
                onChange={(event) => setLookupPlate(event.target.value.toUpperCase())}
                autoCapitalize="characters"
                autoComplete="off"
                placeholder="Search license plate"
                className="h-10 rounded-xl font-mono tracking-wide"
              />
            </div>
            <Button
              type="submit"
              variant="secondary"
              disabled={lookupVehicleMutation.isPending}
              className="h-10 rounded-xl px-4 text-[13px] font-semibold"
            >
              {lookupVehicleMutation.isPending ? (
                <LoaderCircle className="size-4 animate-spin" />
              ) : (
                <Search className="size-4" />
              )}
              Search
            </Button>
          </form>

          {lookupError ? (
            <div className="mt-3 rounded-xl border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {lookupError}
            </div>
          ) : null}

          {lookupVehicle ? (
            <div className="mt-3 rounded-2xl border border-primary/35 bg-primary/10 p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex min-w-0 items-center gap-3">
                  <div className="grid size-10 shrink-0 place-items-center rounded-xl border border-primary/35 bg-background/65">
                    <Search className="size-5 text-primary" />
                  </div>
                  <div className="min-w-0">
                    <p className="truncate font-mono text-sm font-semibold tracking-wide">
                      {lookupVehicle.licensePlate}
                    </p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {getVehicleTypeName(lookupVehicle, vehicleTypes)} |{" "}
                      {formatRegisteredDate(lookupVehicle.createdAt)}
                    </p>
                  </div>
                </div>
                <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/35 bg-background/45 px-2.5 py-1 text-xs font-medium text-primary">
                  Lookup result
                </span>
              </div>
            </div>
          ) : null}

          <div className="mt-5 overflow-hidden rounded-2xl border border-border bg-background/35">
            {vehiclesQuery.isLoading ? (
              <div className="flex items-center gap-2 p-4 text-sm text-muted-foreground">
                <LoaderCircle className="size-4 animate-spin" />
                Loading registered vehicles...
              </div>
            ) : vehicleListError ? (
              <div className="p-4 text-sm text-destructive">{vehicleListError}</div>
            ) : vehicles.length > 0 ? (
              vehicles.map((vehicle) => (
                <div
                  key={vehicle._id}
                  className="flex flex-wrap items-center justify-between gap-3 border-t border-border/70 p-4 first:border-t-0"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="grid size-10 shrink-0 place-items-center rounded-xl border border-border bg-background/65">
                      <CarFront className="size-5 text-primary" />
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
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-status-empty/35 bg-status-empty/10 px-2.5 py-1 text-xs font-medium text-status-empty">
                    <CheckCircle2 className="size-3.5" />
                    {vehicle.monthlyCardId ? "Monthly card" : "Registered"}
                  </span>
                </div>
              ))
            ) : (
              <div className="p-4 text-sm text-muted-foreground">No vehicles registered yet.</div>
            )}
          </div>
        </section>

        <section className="mt-6 rounded-3xl border border-border/70 bg-card/65 p-2 shadow-soft">
          <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-4">
            {quickActions.map((action) => {
              const Icon = action.icon;
              return (
                <button
                  key={action.title}
                  type="button"
                  className={`rounded-2xl border px-4 py-4 text-left transition ${
                    action.highlighted
                      ? "border-primary/45 bg-primary/10"
                      : "border-border bg-background/35 hover:bg-background/60"
                  }`}
                >
                  <div className="mb-3 inline-flex size-8 items-center justify-center rounded-lg border border-border bg-background/65">
                    <Icon className="size-4 text-primary" />
                  </div>
                  <h2 className="text-base font-semibold tracking-tight">{action.title}</h2>
                  <p className="mt-1 text-xs leading-5 text-muted-foreground">
                    {action.description}
                  </p>
                  <span className="mt-3 inline-block text-xs font-medium text-primary">
                    {action.cta}
                  </span>
                </button>
              );
            })}
          </div>
        </section>

        <section className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
          <div className="rounded-3xl border border-border/75 bg-card/70 p-5 shadow-soft md:p-6">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                  View parking information
                </p>
                <h3 className="mt-2 text-2xl font-semibold tracking-tight">Level L1 layout</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  Choose an available slot to reserve. Supported reservations are held for up to 15
                  minutes.
                </p>
              </div>

              <div className="flex flex-wrap gap-2 text-xs">
                <Legend label={`Available ${availableCount}`} tone="bg-status-empty" />
                <Legend label={`Occupied ${occupiedCount}`} tone="bg-status-full" />
                <Legend label={`Reserved ${reservedCount}`} tone="bg-status-reserved" />
              </div>
            </div>

            <SlotAvailabilityFilter />
          </div>

          <aside className="rounded-3xl border border-border/75 bg-card/70 p-5 shadow-soft">
            {selectedSpot ? (
              <div className="space-y-4">
                <div className="rounded-2xl border border-border bg-background/40 p-4">
                  <div className="flex items-center justify-between">
                    <h4 className="text-lg font-semibold tracking-tight">{selectedSpot.id}</h4>
                    <span
                      className={`rounded-full border px-2.5 py-1 text-xs font-medium ${statusBadge[selectedSpot.status]}`}
                    >
                      {statusText[selectedSpot.status]}
                    </span>
                  </div>
                  <div className="mt-3 space-y-2 text-sm text-muted-foreground">
                    <p className="inline-flex items-center gap-2">
                      <CircleDashed className="size-4" />
                      Zone C - Level L1
                    </p>
                    <p className="inline-flex items-center gap-2">
                      <Clock3 className="size-4" />
                      Hold limit: 15 minutes
                    </p>
                    <p className="inline-flex items-center gap-2">
                      <ShieldCheck className="size-4" />
                      Camera monitored 24/7
                    </p>
                  </div>
                </div>

                <div className="rounded-2xl border border-border bg-background/40 p-4">
                  <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                    Session and payment
                  </p>
                  <div className="mt-3 space-y-2 text-sm">
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Active timer</span>
                      <span className="font-semibold">01:42:15</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Current fee</span>
                      <span className="font-semibold">$8.50</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Wallet balance</span>
                      <span className="font-semibold">$24.50</span>
                    </div>
                  </div>
                  <div className="mt-4 grid gap-2">
                    <button
                      type="button"
                      className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground"
                    >
                      <Wallet className="size-4" />
                      Make payment
                    </button>
                    <button
                      type="button"
                      className="inline-flex items-center justify-center gap-2 rounded-xl border border-border bg-background/55 px-3 py-2 text-sm font-medium"
                    >
                      <MapPin className="size-4" />
                      Reserve this slot
                    </button>
                  </div>
                </div>

                <div className="rounded-2xl border border-border bg-background/40 p-4">
                  <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                    Feedback and incident reports
                  </p>
                  <p className="mt-2 text-sm text-muted-foreground">
                    Report wrong assignment, faulty scanner, payment issues, or safety incidents.
                  </p>
                  <button
                    type="button"
                    className="mt-4 inline-flex items-center gap-2 rounded-xl border border-border bg-background/55 px-3 py-2 text-sm font-medium"
                  >
                    <MessageSquareWarning className="size-4" />
                    Submit report
                  </button>
                </div>
              </div>
            ) : (
              <div className="grid h-full place-items-center rounded-2xl border border-dashed border-border bg-background/35 p-6 text-center">
                <div>
                  <div className="mx-auto mb-3 grid size-14 place-items-center rounded-full border border-border bg-background">
                    <MapPin className="size-6 text-muted-foreground" />
                  </div>
                  <h4 className="text-xl font-semibold tracking-tight">No spot selected</h4>
                  <p className="mt-2 text-sm text-muted-foreground">
                    Click an available green slot to reserve parking, track session, or continue to
                    payment.
                  </p>
                </div>
              </div>
            )}
          </aside>
        </section>
      </main>
    </div>
  );
}

function getVehicleTypeName(vehicle: Vehicle, vehicleTypes: VehicleType[]) {
  if (typeof vehicle.vehicleTypeId === "object" && vehicle.vehicleTypeId?.type) {
    return vehicle.vehicleTypeId.type;
  }

  const matchedType = vehicleTypes.find((type) => type._id === vehicle.vehicleTypeId);
  return matchedType?.type ?? "Vehicle";
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
    return "Registered";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "Registered";
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

function Legend({ label, tone }: { label: string; tone: string }) {
  return (
    <span className="inline-flex items-center gap-2 rounded-full border border-border bg-background/60 px-3 py-1.5 text-xs text-muted-foreground">
      <span className={`size-2 rounded-full ${tone}`} />
      {label}
    </span>
  );
}

function InfoStat({ label, value, tone }: { label: string; value: string; tone: string }) {
  return (
    <div className="rounded-2xl border border-border bg-background/50 px-4 py-3">
      <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
        {label}
      </p>
      <p className={`mt-2 text-xl font-semibold tracking-tight ${tone}`}>{value}</p>
    </div>
  );
}
