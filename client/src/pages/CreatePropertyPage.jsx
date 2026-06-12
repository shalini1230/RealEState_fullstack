import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { apiFetch } from "@/lib/api"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Building2, ArrowLeft, Loader2, Home, Hotel, Landmark, Store, UploadCloud, X, ImageIcon, MapPin } from "lucide-react"
import LocationPicker from "@/components/LocationPicker"

// ── Zod schemas (mirror server) ────────────────────────────────────────────────
const baseSchema = z.object({
  title: z.string().min(3, "Title must be at least 3 characters"),
  description: z.string().optional(),
  price: z.coerce.number({ invalid_type_error: "Enter a valid price" }).positive("Price must be positive"),
  vacancies: z.coerce.number({ invalid_type_error: "Enter a valid number" }).int().min(1, "At least 1 vacancy required"),
  city: z.string().min(1, "City is required"),
  area: z.string().min(1, "Area is required"),
  address: z.string().optional(),
  type: z.enum(["APARTMENT", "HOSTEL", "LAND", "COMMERCIAL"]),
})

const apartmentSchema = z.object({
  rooms: z.coerce.number().int().min(1, "Min 1 room"),
  bathrooms: z.coerce.number().int().min(1, "Min 1 bathroom"),
  floor: z.coerce.number().int().optional(),
  balcony: z.boolean().default(false),
  furnished: z.boolean().default(false),
  lift: z.boolean().default(false),
  maintenanceCharges: z.coerce.number().optional(),
})

const hostelSchema = z.object({
  gender: z.enum(["MALE", "FEMALE", "MIXED"]),
  sharing: z.enum(["SINGLE", "DOUBLE", "TRIPLE", "QUAD"]),
  wifi: z.boolean().default(false),
  food: z.boolean().default(false),
})

const landSchema = z.object({
  sizeAcres: z.coerce.number().positive("Enter a valid size"),
  roadAccess: z.boolean().default(false),
  usage: z.enum(["RESIDENTIAL", "COMMERCIAL", "AGRICULTURAL"]),
})

const commercialSchema = z.object({
  shopType: z.string().min(1, "Shop type is required"),
  floorArea: z.coerce.number().positive("Enter a valid floor area"),
  securityDeposit: z.coerce.number().optional(),
  purpose: z.enum(["COMMERCIAL", "RESIDENTIAL"]),
})

const PROPERTY_TYPES = [
  { value: "APARTMENT", label: "Apartment", icon: Home },
  { value: "HOSTEL", label: "Hostel / PG", icon: Hotel },
  { value: "LAND", label: "Land / Plot", icon: Landmark },
  { value: "COMMERCIAL", label: "Commercial", icon: Store },
]

// ── Field helpers ─────────────────────────────────────────────────────────────
function Field({ label, error, children }) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      {children}
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  )
}

function CheckField({ id, label, checked, onCheckedChange }) {
  return (
    <div className="flex items-center gap-2">
      <Checkbox id={id} checked={checked} onCheckedChange={onCheckedChange} />
      <Label htmlFor={id} className="cursor-pointer font-normal">{label}</Label>
    </div>
  )
}

// ── Extension field panels ────────────────────────────────────────────────────
function ApartmentFields({ form, errors }) {
  return (
    <div className="grid grid-cols-2 gap-4">
      <Field label="Rooms (BHK)" error={errors.rooms?.message}>
        <Input type="number" min={1} placeholder="e.g. 2" {...form.register("rooms")} className="h-10" />
      </Field>
      <Field label="Bathrooms" error={errors.bathrooms?.message}>
        <Input type="number" min={1} placeholder="e.g. 1" {...form.register("bathrooms")} className="h-10" />
      </Field>
      <Field label="Floor (optional)" error={errors.floor?.message}>
        <Input type="number" min={0} placeholder="e.g. 3" {...form.register("floor")} className="h-10" />
      </Field>
      <Field label="Maintenance Charges ₹/mo (optional)" error={errors.maintenanceCharges?.message}>
        <Input type="number" min={0} placeholder="e.g. 1500" {...form.register("maintenanceCharges")} className="h-10" />
      </Field>
      <div className="col-span-2 flex flex-wrap gap-x-6 gap-y-3">
        <CheckField id="balcony" label="Balcony" checked={form.watch("balcony")} onCheckedChange={(v) => form.setValue("balcony", v)} />
        <CheckField id="furnished" label="Furnished" checked={form.watch("furnished")} onCheckedChange={(v) => form.setValue("furnished", v)} />
        <CheckField id="lift" label="Lift / Elevator" checked={form.watch("lift")} onCheckedChange={(v) => form.setValue("lift", v)} />
      </div>
    </div>
  )
}

function HostelFields({ form, errors }) {
  return (
    <div className="grid grid-cols-2 gap-4">
      <Field label="Gender" error={errors.gender?.message}>
        <Select value={form.watch("gender")} onValueChange={(v) => form.setValue("gender", v)}>
          <SelectTrigger className="h-10"><SelectValue placeholder="Select…" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="MALE">Male</SelectItem>
            <SelectItem value="FEMALE">Female</SelectItem>
            <SelectItem value="MIXED">Mixed</SelectItem>
          </SelectContent>
        </Select>
      </Field>
      <Field label="Sharing type" error={errors.sharing?.message}>
        <Select value={form.watch("sharing")} onValueChange={(v) => form.setValue("sharing", v)}>
          <SelectTrigger className="h-10"><SelectValue placeholder="Select…" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="SINGLE">Single</SelectItem>
            <SelectItem value="DOUBLE">Double</SelectItem>
            <SelectItem value="TRIPLE">Triple</SelectItem>
            <SelectItem value="QUAD">Quad</SelectItem>
          </SelectContent>
        </Select>
      </Field>
      <div className="col-span-2 flex gap-6">
        <CheckField id="wifi" label="WiFi included" checked={form.watch("wifi")} onCheckedChange={(v) => form.setValue("wifi", v)} />
        <CheckField id="food" label="Food included" checked={form.watch("food")} onCheckedChange={(v) => form.setValue("food", v)} />
      </div>
    </div>
  )
}

function LandFields({ form, errors }) {
  return (
    <div className="grid grid-cols-2 gap-4">
      <Field label="Size (acres)" error={errors.sizeAcres}>
        <Input type="number" step="0.01" placeholder="e.g. 0.5" {...form.register("sizeAcres")} className="h-10" />
      </Field>
      <Field label="Land usage" error={errors.usage}>
        <Select value={form.watch("usage")} onValueChange={(v) => form.setValue("usage", v)}>
          <SelectTrigger className="h-10"><SelectValue placeholder="Select…" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="RESIDENTIAL">Residential</SelectItem>
            <SelectItem value="COMMERCIAL">Commercial</SelectItem>
            <SelectItem value="AGRICULTURAL">Agricultural</SelectItem>
          </SelectContent>
        </Select>
      </Field>
      <div className="flex items-center gap-2 pt-2">
        <CheckField id="roadAccess" label="Road access available" checked={form.watch("roadAccess")} onCheckedChange={(v) => form.setValue("roadAccess", v)} />
      </div>
    </div>
  )
}

function CommercialFields({ form, errors }) {
  return (
    <div className="grid grid-cols-2 gap-4">
      <Field label="Shop / unit type" error={errors.shopType}>
        <Input placeholder="e.g. Retail, Office, Warehouse" {...form.register("shopType")} className="h-10" />
      </Field>
      <Field label="Purpose" error={errors.purpose?.message}>
        <Select value={form.watch("purpose") || ""} onValueChange={(v) => form.setValue("purpose", v, { shouldValidate: true })}>
          <SelectTrigger className="h-10"><SelectValue placeholder="Select purpose" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="COMMERCIAL">Commercial</SelectItem>
            <SelectItem value="RESIDENTIAL">Residential</SelectItem>
          </SelectContent>
        </Select>
      </Field>
      <Field label="Floor area (sq ft)" error={errors.floorArea}>
        <Input type="number" step="0.01" placeholder="e.g. 500" {...form.register("floorArea")} className="h-10" />
      </Field>
      <Field label="Security deposit (optional)" error={errors.securityDeposit}>
        <Input type="number" placeholder="e.g. 50000" {...form.register("securityDeposit")} className="h-10" />
      </Field>
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────
export default function CreatePropertyPage() {
  const navigate = useNavigate()
  const [selectedType, setSelectedType] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [serverError, setServerError] = useState("")
  const [coverImage, setCoverImage] = useState(null)
  const [interiorImages, setInteriorImages] = useState([])
  const [uploadingCover, setUploadingCover] = useState(false)
  const [uploadingInterior, setUploadingInterior] = useState(false)
  const [uploadError, setUploadError] = useState("")
  const [pinLocation, setPinLocation] = useState(null)

  async function uploadFile(file) {
    const session = JSON.parse(localStorage.getItem("session") || "null")
    if (!session?.access_token) throw new Error("Session expired — please log out and log in again.")
    const formData = new FormData()
    formData.append("image", file)
    const res = await fetch("http://localhost:3000/upload", {
      method: "POST",
      headers: { Authorization: `Bearer ${session.access_token}` },
      body: formData,
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error || "Upload failed")
    return data.url
  }

  async function handleCoverUpload(e) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploadingCover(true)
    setUploadError("")
    try {
      const url = await uploadFile(file)
      setCoverImage(url)
    } catch (err) {
      setUploadError(err.message)
    } finally {
      setUploadingCover(false)
      e.target.value = ""
    }
  }

  async function handleInteriorUpload(e) {
    const files = Array.from(e.target.files)
    if (!files.length) return
    setUploadingInterior(true)
    setUploadError("")
    try {
      for (const file of files) {
        const url = await uploadFile(file)
        setInteriorImages((prev) => [...prev, url])
      }
    } catch (err) {
      setUploadError(err.message)
    } finally {
      setUploadingInterior(false)
      e.target.value = ""
    }
  }

  function removeInterior(url) {
    setInteriorImages((prev) => prev.filter((u) => u !== url))
  }

  const detailsSchemas = { APARTMENT: apartmentSchema, HOSTEL: hostelSchema, LAND: landSchema, COMMERCIAL: commercialSchema }

  const schema = selectedType
    ? baseSchema.and(detailsSchemas[selectedType])
    : baseSchema

  const TYPE_DEFAULTS = { balcony: false, furnished: false, lift: false, maintenanceCharges: undefined, wifi: false, food: false, roadAccess: false, rooms: undefined, bathrooms: undefined, floor: undefined, gender: undefined, sharing: undefined, sizeAcres: undefined, usage: undefined, shopType: undefined, floorArea: undefined, securityDeposit: undefined, purpose: undefined }

  const form = useForm({ resolver: zodResolver(schema), defaultValues: { balcony: false, furnished: false, lift: false, wifi: false, food: false, roadAccess: false } })
  const errors = form.formState.errors

  function handleTypeChange(value) {
    setSelectedType(value)
    form.setValue("type", value)
    Object.entries(TYPE_DEFAULTS).forEach(([k, v]) => form.setValue(k, v))
  }

  async function onSubmit(values) {
    setSubmitting(true)
    setServerError("")
    const { title, description, price, vacancies, city, area, address, type, ...detailFields } = values
    try {
      const images = [...(coverImage ? [coverImage] : []), ...interiorImages]
      await apiFetch("/properties", {
        method: "POST",
        body: JSON.stringify({ title, description, price, vacancies, city, area, address, type, images, gpsLat: pinLocation?.lat, gpsLng: pinLocation?.lng, details: detailFields }),
      })
      navigate("/properties")
    } catch (err) {
      setServerError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-100 sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 h-16 flex items-center gap-3">
          <button onClick={() => navigate("/properties")} className="text-slate-400 hover:text-slate-600 transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: "var(--accent)" }}>
              <Building2 className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-slate-900">List a Property</span>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">

          {/* Property type selector */}
          <div className="bg-white rounded-2xl border border-slate-100 p-6 space-y-4">
            <h2 className="font-semibold text-slate-900">Property type</h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {PROPERTY_TYPES.map(({ value, label, icon: Icon }) => {
                const active = selectedType === value
                return (
                  <button
                    key={value}
                    type="button"
                    onClick={() => handleTypeChange(value)}
                    className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all text-sm font-medium ${
                      active ? "border-[var(--accent)] text-[var(--accent)]" : "border-slate-200 text-slate-500 hover:border-slate-300"
                    }`}
                    style={{ background: active ? "var(--accent-bg)" : "white" }}
                  >
                    <Icon className="w-5 h-5" />
                    {label}
                  </button>
                )
              })}
            </div>
            {errors.type && <p className="text-xs text-red-500">{errors.type.message}</p>}
          </div>

          {/* Base fields */}
          <div className="bg-white rounded-2xl border border-slate-100 p-6 space-y-4">
            <h2 className="font-semibold text-slate-900">Basic details</h2>
            <Field label="Title" error={errors.title?.message}>
              <Input placeholder="e.g. Spacious 2BHK in Koramangala" {...form.register("title")} className="h-10" />
            </Field>
            <Field label="Description (optional)" error={errors.description?.message}>
              <Textarea placeholder="Describe the property…" rows={3} {...form.register("description")} />
            </Field>
            <div className="grid grid-cols-2 gap-4">
              <Field label="City" error={errors.city?.message}>
                <Input placeholder="e.g. Bangalore" {...form.register("city")} className="h-10" />
              </Field>
              <Field label="Area / Locality" error={errors.area?.message}>
                <Input placeholder="e.g. Koramangala" {...form.register("area")} className="h-10" />
              </Field>
            </div>
            <Field label="Full address (optional)" error={errors.address?.message}>
              <Input placeholder="e.g. #12, 5th Cross, 3rd Block" {...form.register("address")} className="h-10" />
            </Field>
            <div className="grid grid-cols-2 gap-4">
              <Field label={selectedType === "LAND" ? "Price (₹ total)" : "Price (₹ / month)"} error={errors.price?.message}>
                <Input type="number" placeholder="e.g. 15000" {...form.register("price")} className="h-10" />
              </Field>
              <Field label="Number of Vacancies" error={errors.vacancies?.message}>
                <Input type="number" min={1} placeholder="e.g. 2" {...form.register("vacancies")} className="h-10" />
              </Field>
            </div>
          </div>

          {/* Dynamic extension fields */}
          {selectedType && (
            <div className="bg-white rounded-2xl border border-slate-100 p-6 space-y-4">
              <h2 className="font-semibold text-slate-900">
                {PROPERTY_TYPES.find(t => t.value === selectedType)?.label} details
              </h2>
              {selectedType === "APARTMENT" && <ApartmentFields form={form} errors={errors} />}
              {selectedType === "HOSTEL" && <HostelFields form={form} errors={errors} />}
              {selectedType === "LAND" && <LandFields form={form} errors={errors} />}
              {selectedType === "COMMERCIAL" && <CommercialFields form={form} errors={errors} />}
            </div>
          )}

          {/* Map pin */}
          <div className="bg-white rounded-2xl border border-slate-100 p-6 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-slate-900">Property Location</h2>
              {pinLocation && (
                <span className="flex items-center gap-1.5 text-xs text-green-600 bg-green-50 px-3 py-1 rounded-full font-medium">
                  <MapPin className="w-3 h-3" />
                  Pin dropped
                </span>
              )}
            </div>
            <LocationPicker onSelect={(coords) => setPinLocation(coords)} />
          </div>

          {/* Cover Photo */}
          <div className="bg-white rounded-2xl border border-slate-100 p-6 space-y-4">
            <div>
              <h2 className="font-semibold text-slate-900">Cover Photo</h2>
              <p className="text-xs text-slate-400 mt-0.5">This is the first image people see in the property listing.</p>
            </div>

            {coverImage ? (
              <div className="relative rounded-xl overflow-hidden border border-slate-100" style={{ height: 200 }}>
                <img src={coverImage} alt="cover" className="w-full h-full object-cover" />
                <button
                  type="button"
                  onClick={() => setCoverImage(null)}
                  className="absolute top-2 right-2 w-7 h-7 bg-black/60 hover:bg-black/80 rounded-full flex items-center justify-center"
                >
                  <X className="w-4 h-4 text-white" />
                </button>
                <span className="absolute bottom-2 left-2 text-xs bg-black/50 text-white px-2 py-0.5 rounded-full backdrop-blur-sm">Cover</span>
              </div>
            ) : (
              <label className={`flex flex-col items-center justify-center gap-2 border-2 border-dashed rounded-xl p-8 cursor-pointer transition-colors ${uploadingCover ? "border-slate-200 bg-slate-50" : "border-slate-300 hover:border-violet-400 hover:bg-violet-50"}`}>
                <input type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={handleCoverUpload} disabled={uploadingCover} />
                {uploadingCover ? <Loader2 className="w-6 h-6 text-slate-400 animate-spin" /> : <UploadCloud className="w-6 h-6 text-slate-400" />}
                <span className="text-sm text-slate-500">{uploadingCover ? "Uploading…" : "Click to upload cover photo"}</span>
                <span className="text-xs text-slate-400">JPEG, PNG, WebP · Max 10MB</span>
              </label>
            )}
          </div>

          {/* Interior Photos */}
          <div className="bg-white rounded-2xl border border-slate-100 p-6 space-y-4">
            <div>
              <h2 className="font-semibold text-slate-900">Interior Photos</h2>
              <p className="text-xs text-slate-400 mt-0.5">Show rooms, kitchen, bathrooms and other spaces inside.</p>
            </div>

            <label className={`flex flex-col items-center justify-center gap-2 border-2 border-dashed rounded-xl p-6 cursor-pointer transition-colors ${uploadingInterior ? "border-slate-200 bg-slate-50" : "border-slate-300 hover:border-violet-400 hover:bg-violet-50"}`}>
              <input type="file" accept="image/jpeg,image/png,image/webp" multiple className="hidden" onChange={handleInteriorUpload} disabled={uploadingInterior} />
              {uploadingInterior ? <Loader2 className="w-6 h-6 text-slate-400 animate-spin" /> : <UploadCloud className="w-6 h-6 text-slate-400" />}
              <span className="text-sm text-slate-500">{uploadingInterior ? "Uploading…" : "Click to upload interior photos"}</span>
              <span className="text-xs text-slate-400">JPEG, PNG, WebP · Max 10MB each · Multiple allowed</span>
            </label>

            {uploadError && (
              <div className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-4 py-3">
                {uploadError}
              </div>
            )}

            {interiorImages.length > 0 && (
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                {interiorImages.map((url) => (
                  <div key={url} className="relative group rounded-xl overflow-hidden aspect-square border border-slate-100">
                    <img src={url} alt="interior" className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => removeInterior(url)}
                      className="absolute top-1 right-1 w-6 h-6 bg-black/60 hover:bg-black/80 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X className="w-3.5 h-3.5 text-white" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {interiorImages.length === 0 && !uploadingInterior && (
              <div className="flex items-center gap-2 text-xs text-slate-400">
                <ImageIcon className="w-4 h-4" />
                No interior photos added yet
              </div>
            )}
          </div>

          {serverError && (
            <div className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-4 py-3">
              {serverError}
            </div>
          )}

          <Button
            type="submit"
            disabled={submitting || !selectedType}
            className="w-full h-11 text-white"
            style={{ background: "var(--accent)" }}
          >
            {submitting && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
            {submitting ? "Listing property…" : "List Property"}
          </Button>
        </form>
      </main>
    </div>
  )
}
