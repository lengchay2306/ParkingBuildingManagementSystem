import type { FormEvent } from "react";
import { CarFront, LoaderCircle, Plus, Search } from "lucide-react";

import {
  DriverVehicleCard,
  findPendingReservationForVehicle,
} from "@/components/driver/DriverVehicleCard";
import { getVehicleReserveBlockReason } from "@/lib/parking-validation";
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
import { DashboardClientPagination, paginateItems } from "@/components/dashboard-ui";
import type { ParkingSession } from "@/services/parking.service";
import type { Reservation } from "@/services/reservation.service";
import type { Vehicle, VehicleType } from "@/services/vehicle.service";

type DriverVehiclesReservationsPanelProps = {
  vehicles: Vehicle[];
  vehicleTypes: VehicleType[];
  reservations: Reservation[];
  vehiclePagination: ReturnType<typeof paginateItems<Vehicle>>;
  sessionsByVehicleId: Map<string, ParkingSession>;
  vehicleParkingSessions: ParkingSession[];
  isVehiclesLoading: boolean;
  vehicleListError: string | null;
  isVehicleTypeLoading: boolean;
  vehicleTypeError: string | null;
  licensePlate: string;
  vehicleTypeId: string;
  vehicleFormError: string | null;
  isVehicleFormOpen: boolean;
  isCreateVehiclePending: boolean;
  deletingVehicleId: string | null;
  subscribingVehicleId: string | null;
  vehiclePlateSearch: string;
  totalVehicleCount: number;
  onVehiclePlateSearchChange: (value: string) => void;
  onVehiclePageChange: (page: number) => void;
  onVehicleFormOpenChange: (open: boolean) => void;
  onLicensePlateChange: (value: string) => void;
  onVehicleTypeIdChange: (value: string) => void;
  onVehicleSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onReserveVehicle: (vehicle: Vehicle) => void;
  onBuyMonthlyCard: (vehicle: Vehicle) => void;
  onEditVehicle: (vehicle: Vehicle) => void;
  onDeleteVehicle: (vehicle: Vehicle) => void;
};

export function DriverVehiclesReservationsPanel({
  vehicles,
  vehicleTypes,
  reservations,
  vehiclePagination,
  sessionsByVehicleId,
  vehicleParkingSessions,
  isVehiclesLoading,
  vehicleListError,
  isVehicleTypeLoading,
  vehicleTypeError,
  licensePlate,
  vehicleTypeId,
  vehicleFormError,
  isVehicleFormOpen,
  isCreateVehiclePending,
  deletingVehicleId,
  subscribingVehicleId,
  vehiclePlateSearch,
  totalVehicleCount,
  onVehiclePlateSearchChange,
  onVehiclePageChange,
  onVehicleFormOpenChange,
  onLicensePlateChange,
  onVehicleTypeIdChange,
  onVehicleSubmit,
  onReserveVehicle,
  onBuyMonthlyCard,
  onEditVehicle,
  onDeleteVehicle,
}: DriverVehiclesReservationsPanelProps) {
  return (
    <section className="api-section flex min-h-[420px] flex-col rounded-2xl p-4 sm:p-5">
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <div className="min-w-0 flex-1 space-y-1.5 sm:max-w-xs">
            <Label htmlFor="driver-vehicle-plate-search" className="text-[10px] uppercase tracking-[0.14em]">
              Tìm xe theo biển số
            </Label>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="driver-vehicle-plate-search"
                value={vehiclePlateSearch}
                onChange={(event) => onVehiclePlateSearchChange(event.target.value.toUpperCase())}
                autoCapitalize="characters"
                autoComplete="off"
                className="h-10 rounded-xl pl-9 font-mono text-sm"
              />
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Dialog open={isVehicleFormOpen} onOpenChange={onVehicleFormOpenChange}>
              <DialogTrigger asChild>
                <Button type="button" className="h-10 rounded-xl px-4 text-[13px] font-semibold">
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

                <form onSubmit={onVehicleSubmit} className="space-y-4 px-6 py-4">
                  <div className="ui-form-panel space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="driver-panel-vehicle-license-plate">Biển số</Label>
                      <Input
                        id="driver-panel-vehicle-license-plate"
                        value={licensePlate}
                        onChange={(event) => onLicensePlateChange(event.target.value.toUpperCase())}
                        autoCapitalize="characters"
                        autoComplete="off"
                        inputMode="text"
                        placeholder="51A-12345"
                        className="h-11 rounded-xl font-mono tracking-wide"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="driver-panel-vehicle-type">Loại xe</Label>
                      <Select
                        value={vehicleTypeId}
                        onValueChange={onVehicleTypeIdChange}
                        disabled={isVehicleTypeLoading}
                      >
                        <SelectTrigger id="driver-panel-vehicle-type" className="h-11 rounded-xl">
                          <SelectValue
                            placeholder={
                              isVehicleTypeLoading ? "Đang tải loại xe..." : "Chọn loại xe"
                            }
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

                  <Button
                    type="submit"
                    disabled={isCreateVehiclePending || isVehicleTypeLoading}
                    className="h-11 w-full rounded-xl text-[13px] font-semibold"
                  >
                    {isCreateVehiclePending ? (
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

        <div className="min-h-0 flex-1 overflow-y-auto">
          {isVehiclesLoading ? (
            <div className="flex items-center gap-2 rounded-2xl border border-border/70 bg-card/60 p-4 text-sm text-muted-foreground">
              <LoaderCircle className="size-4 animate-spin" />
              Đang tải xe của bạn...
            </div>
          ) : vehicleListError ? (
            <div className="rounded-2xl border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">
              {vehicleListError}
            </div>
          ) : vehiclePagination.items.length > 0 ? (
            <div className="driver-vehicle-list space-y-3">
              {vehiclePagination.items.map((vehicle) => (
                <DriverVehicleCard
                  key={vehicle._id}
                  vehicle={vehicle}
                  vehicleTypes={vehicleTypes}
                  pendingReservation={findPendingReservationForVehicle(vehicle._id, reservations)}
                  parkingSession={sessionsByVehicleId.get(vehicle._id) ?? null}
                  canReserve={
                    !getVehicleReserveBlockReason(
                      vehicle._id,
                      vehicle.licensePlate,
                      reservations,
                      vehicleParkingSessions,
                    )
                  }
                  isDeleting={deletingVehicleId === vehicle._id}
                  isSubscribing={subscribingVehicleId === vehicle._id}
                  onReserve={() => onReserveVehicle(vehicle)}
                  onBuyMonthlyCard={() => onBuyMonthlyCard(vehicle)}
                  onEdit={() => onEditVehicle(vehicle)}
                  onDelete={() => onDeleteVehicle(vehicle)}
                />
              ))}
              <DashboardClientPagination
                page={vehiclePagination.page}
                totalPages={vehiclePagination.totalPages}
                totalItems={vehiclePagination.totalItems}
                onPageChange={onVehiclePageChange}
              />
            </div>
          ) : vehiclePlateSearch.trim() && totalVehicleCount > 0 ? (
            <div className="flex min-h-[240px] flex-col items-center justify-center rounded-xl border border-dashed border-border/80 bg-secondary/30 px-6 py-10 text-center">
              <CarFront className="mb-3 size-10 text-muted-foreground/60" />
              <p className="text-sm text-muted-foreground">
                Không tìm thấy xe khớp biển số &quot;{vehiclePlateSearch.trim().toUpperCase()}&quot;.
              </p>
            </div>
          ) : (
            <div className="flex min-h-[240px] flex-col items-center justify-center rounded-xl border border-dashed border-border/80 bg-secondary/30 px-6 py-10 text-center">
              <CarFront className="mb-3 size-10 text-muted-foreground/60" />
              <p className="text-sm text-muted-foreground">
                Bạn chưa có xe nào. Bấm &quot;Thêm xe&quot; để đăng ký biển số.
              </p>
            </div>
          )}
        </div>
    </section>
  );
}
