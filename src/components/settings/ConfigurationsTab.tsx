import { useState, useEffect } from "react";
import { Card, CardContent } from "../ui/card";
import { Label } from "../ui/label";
import { Input } from "../ui/input";
import { Button } from "../ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { Save, Loader2, AlertTriangle } from "lucide-react";
import { toast } from "sonner@2.0.3";
import { getFunction, postFunction } from "../../shared/api/client";
import { handleApiError } from "../../shared/utils/errorHandler";

interface Location {
  id: string;
  location: string;
  status: string;
}

const DEFAULT_CONFIG = {
  rentalDays: "2",
  reservationDownPayment: "25",
  rentDownPayment: "50",
  extraDaysPrice: "75",
  lateDaysPrice: "75",
  cancelationFee: "25",
  returnLocation: "",
  storeAssistantWageByHour: "5000",
  reserveBlockPrevDays: "4",
  reserveBlockNextDays: "1",
};

export function ConfigurationsTab() {
  const [config, setConfig] = useState(DEFAULT_CONFIG);
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  // Load configuration and locations on mount
  useEffect(() => {
    loadConfiguration();
    loadLocations();
  }, []);

  const loadConfiguration = async () => {
    try {
      setLoading(true);
      const data = await getFunction<any>("get-configuration");
      
      // Ensure all required fields exist, merge with defaults
      const reservationDownPayment = data.config?.reservationDownPayment || DEFAULT_CONFIG.reservationDownPayment;
      const loadedConfig = {
        rentalDays: data.config?.rentalDays || DEFAULT_CONFIG.rentalDays,
        reservationDownPayment,
        rentDownPayment: data.config?.rentDownPayment || DEFAULT_CONFIG.rentDownPayment,
        extraDaysPrice: data.config?.extraDaysPrice || DEFAULT_CONFIG.extraDaysPrice,
        lateDaysPrice: data.config?.lateDaysPrice || DEFAULT_CONFIG.lateDaysPrice,
        // Cancellation fee always matches reservation down payment
        cancelationFee: reservationDownPayment,
        returnLocation: data.config?.returnLocation || DEFAULT_CONFIG.returnLocation,
        storeAssistantWageByHour: data.config?.storeAssistantWageByHour || DEFAULT_CONFIG.storeAssistantWageByHour,
        reserveBlockPrevDays: data.config?.reserveBlockPrevDays || DEFAULT_CONFIG.reserveBlockPrevDays,
        reserveBlockNextDays: data.config?.reserveBlockNextDays || DEFAULT_CONFIG.reserveBlockNextDays,
      };
      
      setConfig(loadedConfig);
      
      // Validate on load — flag swapped/invalid down payment values immediately
      setValidationError(validateDownPayments(loadedConfig.reservationDownPayment, loadedConfig.rentDownPayment));
    } catch (error) {
      handleApiError(error, "configuration", "Failed to load configuration. Using defaults.");
      setConfig(DEFAULT_CONFIG); // Ensure we always have valid config
    } finally {
      setLoading(false);
    }
  };

  const loadLocations = async () => {
    try {
      const data = await getFunction<any>("statuses");
      // Filter to only show active locations
      const activeLocations = data.statuses?.filter((loc: Location) => loc.status === "On") || [];
      setLocations(activeLocations);
    } catch (error) {
      handleApiError(error, "locations", "Failed to load locations.");
    }
  };

  const validateDownPayments = (reservation: string, rent: string): string | null => {
    const resVal = parseFloat(reservation);
    const rentVal = parseFloat(rent);
    if (isNaN(resVal) || isNaN(rentVal)) return null;
    if (resVal >= rentVal) {
      return "Reservation Down Payment must be lower than Rent Down Payment. Customers reserve first (smaller commitment) and then rent (larger commitment).";
    }
    return null;
  };

  const handleConfigChange = (field: string, value: string) => {
    // Prevent empty or invalid values
    if (value === "" || value === undefined || value === null) {
      return;
    }
    const newConfig = { ...config, [field]: value };
    
    // Sync cancellation fee with reservation down payment
    if (field === "reservationDownPayment") {
      newConfig.cancelationFee = value;
    }
    
    setConfig(newConfig);

    // Cross-validate down payment fields
    if (field === "reservationDownPayment" || field === "rentDownPayment") {
      setValidationError(validateDownPayments(newConfig.reservationDownPayment, newConfig.rentDownPayment));
    }
  };

  const handleSave = async () => {
    console.log("💾 [Settings] Attempting to save configuration:", config);
    
    // Validate before saving
    const error = validateDownPayments(config.reservationDownPayment, config.rentDownPayment);
    console.log("🔍 [Settings] Validation result:", error || "PASSED");
    
    if (error) {
      setValidationError(error);
      toast.error("Please fix validation errors before saving.");
      console.error("❌ [Settings] Save blocked due to validation error:", error);
      return;
    }

    try {
      setSaving(true);
      
      // Ensure cancellation fee matches reservation down payment before saving
      const configToSave = {
        ...config,
        cancelationFee: config.reservationDownPayment,
      };
      
      console.log("📤 [Settings] Sending configuration to server:", configToSave);
      
      const result = await postFunction<any>("save-configuration", { config: configToSave });
      console.log("✅ [Settings] Configuration saved successfully:", result);
      toast.success("Configuration saved successfully!");
    } catch (error) {
      handleApiError(error, "configuration", "Failed to save configuration");
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    setConfig(DEFAULT_CONFIG);
    setValidationError(null);
    toast.success("Configuration reset to defaults!");
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {loading ? (
        <Card>
          <CardContent className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
          </CardContent>
        </Card>
      ) : (
        <>
          <Card>
            <CardContent className="space-y-6 pt-6">
          {/* Rental Settings */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Rental Settings</h3>
            <div className="grid sm:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="rentalDays">Rental Days</Label>
                <Input
                  id="rentalDays"
                  type="number"
                  min="1"
                  value={config.rentalDays}
                  onChange={(e) => handleConfigChange("rentalDays", e.target.value)}
                />
                <p className="text-sm text-muted-foreground">
                  Number of days the customer keeps the item (return date = start + days)
                </p>
              </div>
            </div>
          </div>

          {/* Reservation Settings */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Reservation Settings</h3>
            <div className="grid sm:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="reserveBlockPrevDays">Previous Lock Days</Label>
                <Input
                  id="reserveBlockPrevDays"
                  type="number"
                  min="0"
                  value={config.reserveBlockPrevDays}
                  onChange={(e) => handleConfigChange("reserveBlockPrevDays", e.target.value)}
                />
                <p className="text-sm text-muted-foreground">
                  Number of days BEFORE the reservation date that the item is locked (unavailable for rent/reservation)
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="reserveBlockNextDays">Posterior Lock Days</Label>
                <Input
                  id="reserveBlockNextDays"
                  type="number"
                  min="0"
                  value={config.reserveBlockNextDays}
                  onChange={(e) => handleConfigChange("reserveBlockNextDays", e.target.value)}
                />
                <p className="text-sm text-muted-foreground">
                  Number of days AFTER the reservation return date that the item is locked (unavailable for rent/reservation)
                </p>
              </div>
            </div>
          </div>

          {/* Payment Settings */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Payment Settings</h3>
            <div className="grid sm:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="reservationDownPayment">Reservation Down Payment (%)</Label>
                <Input
                  id="reservationDownPayment"
                  type="number"
                  min="0"
                  max="100"
                  value={config.reservationDownPayment}
                  onChange={(e) => handleConfigChange("reservationDownPayment", e.target.value)}
                  className={validationError ? "border-red-500 focus-visible:ring-red-500" : ""}
                />
                <p className="text-sm text-muted-foreground">
                  Percentage required to secure a reservation
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="rentDownPayment">Rent Down Payment (%)</Label>
                <Input
                  id="rentDownPayment"
                  type="number"
                  min="0"
                  max="100"
                  value={config.rentDownPayment}
                  onChange={(e) => handleConfigChange("rentDownPayment", e.target.value)}
                  className={validationError ? "border-red-500 focus-visible:ring-red-500" : ""}
                />
                <p className="text-sm text-muted-foreground">
                  Percentage required upfront when renting
                </p>
              </div>
              {validationError && (
                <div className="sm:col-span-2 flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-md">
                  <AlertTriangle className="w-4 h-4 text-red-500 mt-0.5 shrink-0" />
                  <p className="text-sm text-red-700">{validationError}</p>
                </div>
              )}
              <div className="space-y-2">
                <Label htmlFor="cancelationFee">Cancellation Fee (%)</Label>
                <Input
                  id="cancelationFee"
                  type="number"
                  min="0"
                  max="100"
                  value={config.reservationDownPayment}
                  disabled
                  className="bg-muted cursor-not-allowed"
                />
                <p className="text-sm text-muted-foreground">
                  Percentage of full price applied when customer cancels
                </p>
                <p className="text-sm text-muted-foreground">
                  This fee is automatically set to match the Reservation Down Payment
                </p>
              </div>
            </div>
          </div>

          {/* Pricing Multipliers */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Pricing Multipliers</h3>
            <div className="grid sm:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="extraDaysPrice">Extra Days Price (%)</Label>
                <Input
                  id="extraDaysPrice"
                  type="number"
                  min="0"
                  max="200"
                  value={config.extraDaysPrice}
                  onChange={(e) => handleConfigChange("extraDaysPrice", e.target.value)}
                />
                <p className="text-sm text-muted-foreground">
                  Percentage of normal day price for additional rental days
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="lateDaysPrice">Late Days Price (%)</Label>
                <Input
                  id="lateDaysPrice"
                  type="number"
                  min="0"
                  max="200"
                  value={config.lateDaysPrice}
                  onChange={(e) => handleConfigChange("lateDaysPrice", e.target.value)}
                />
                <p className="text-sm text-muted-foreground">
                  Percentage of normal day price for late returns
                </p>
              </div>
            </div>
          </div>

          {/* Return Settings */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Return Settings</h3>
            <div className="grid sm:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="returnLocation">Default Return Status</Label>
                <Select
                  value={config.returnLocation}
                  onValueChange={(value) => handleConfigChange("returnLocation", value)}
                >
                  <SelectTrigger id="returnLocation">
                    <SelectValue placeholder="Select status..." />
                  </SelectTrigger>
                  <SelectContent>
                    {locations.map((location) => (
                      <SelectItem key={location.id} value={location.id}>
                        {location.location}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-sm text-muted-foreground">
                  Default status applied when an item is returned (e.g., "Lavanderia")
                </p>
              </div>
            </div>
          </div>

          {/* Store Settings */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Store Settings</h3>
            <div className="grid sm:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="storeAssistantWageByHour">Store Assistant Wage by Hour ($)</Label>
                <Input
                  id="storeAssistantWageByHour"
                  type="number"
                  min="0"
                  value={config.storeAssistantWageByHour}
                  onChange={(e) => handleConfigChange("storeAssistantWageByHour", e.target.value)}
                />
                <p className="text-sm text-muted-foreground">
                  Hourly wage for the store assistant (used for cost calculations)
                </p>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end pt-4 border-t">
            <Button onClick={handleSave} size="lg" disabled={saving || !!validationError}>
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  Save Configuration
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
        </>
      )}
    </div>
  );
}
