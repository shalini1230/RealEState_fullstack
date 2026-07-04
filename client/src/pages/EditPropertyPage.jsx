import { useEffect, useState } from "react"
import { useNavigate, useParams } from "react-router-dom"
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
import { Building2, ArrowLeft, Loader2, Home, Hotel, Landmark, Store, MapPin, ChevronDown, UploadCloud, X } from "lucide-react"
import LocationPicker from "@/components/LocationPicker"

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

const TYPE_LABEL = { APARTMENT: "Apartment", HOSTEL: "Hostel / PG", LAND: "Land / Plot", COMMERCIAL: "Commercial" }
const TYPE_ICON = { APARTMENT: Home, HOSTEL: Hotel, LAND: Landmark, COMMERCIAL: Store }

const baseSchema = z.object({
  title: z.string().min(3, "Title must be at least 3 characters"),
  description: z.string().optional(),
  price: z.coerce.number({ invalid_type_error: "Enter a valid price" }).positive("Price must be positive"),
  vacancies: z.coerce.number({ invalid_type_error: "Enter a valid number" }).int().min(1, "At least 1 vacancy required"),
  city: z.string().min(1, "City is required"),
  area: z.string().min(1, "Area is required"),
  address: z.string().optional(),
})

export default function EditPropertyPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [property, setProperty] = useState(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [serverError, setServerError] = useState("")
  const [pinLocation, setPinLocation] = useState(null)
  const [showLocationPicker, setShowLocationPicker] = useState(false)
  const [coverImage, setCoverImage] = useState(null)
  const [interiorImages, setInteriorImages] = useState([])
  const [uploadingCover, setUploadingCover] = useState(false)
  const [uploadingInterior, setUploadingInterior] = useState(false)
  const [uploadError, setUploadError] = useState("")

  const form = useForm({ resolver: zodResolver(baseSchema) })

  async function uploadFile(file) {
    const session = JSON.parse(localStorage.getItem("session") || "null")
    if (!session?.access_token) throw new Error("Session expired — please log in again.")
    const formData = new FormData()
    formData.append("image", file)
    const res = await fetch("http://localhost:3000/upload", {
      method: "POST",
      headers: { Authorization: `Bearer ${session.access_token}` },
      body: formData,
    })
    if (!res.ok) throw new Error("Upload failed")
    const data = await res.json()
    return data.url
  }

  async function handleCoverUpload(e) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploadingCover(true)
    setUploadError("")
    try { setCoverImage(await uploadFile(file)) }
    catch (err) { setUploadError(err.message) }
    finally { setUploadingCover(false) }
  }

  async function handleInteriorUpload(e) {
    const files = Array.from(e.target.files || [])
    if (!files.length) return
    setUploadingInterior(true)
    setUploadError("")
    try {
      for (const file of files) {
        const url = await uploadFile(file)
        setInteriorImages(prev => [...prev, url])
      }
    } catch (err) { setUploadError(err.message) }
    finally { setUploadingInterior(false) }
  }
  const errors = form.formState.errors

  useEffect(() => {
    apiFetch(`/properties/${id}`)
      .then((p) => {
        const currentUser = JSON.parse(localStorage.getItem("user") || "null")
        if (!currentUser || p.ownerId !== currentUser.id) {
          navigate(`/properties/${id}`)
          return
        }
        setProperty(p)
        if ((p.gpsLat != null && p.gpsLng != null) || p.mapEmbedUrl) {
          setPinLocation({ lat: p.gpsLat, lng: p.gpsLng, address: p.address || "", mapEmbedUrl: p.mapEmbedUrl || null })
        }
        if (p.images?.length) {
          setCoverImage(p.images[0])
          setInteriorImages(p.images.slice(1))
        }
        form.reset({
          title: p.title,
          description: p.description || "",
          price: p.price,
          vacancies: p.vacancies ?? 1,
          city: p.city,
          area: p.area,
          address: p.address || "",
        })
        // Set type-specific fields
        const d = p.apartment || p.hostel || p.land || p.commercial
        if (d) {
          Object.entries(d).forEach(([k, v]) => {
            if (!["id", "propertyId"].includes(k)) form.setValue(k, v)
          })
        }
      })
      .catch(() => navigate("/properties"))
      .finally(() => setLoading(false))
  }, [id, navigate, form])

  async function onSubmit(values) {
    setSubmitting(true)
    setServerError("")
    const { title, description, price, vacancies, city, area, address, ...detailFields } = values
    try {
      await apiFetch(`/properties/${id}`, {
        method: "PUT",
        body: JSON.stringify({
          title, description, price, vacancies, city, area, address,
          type: property.type,
          details: detailFields,
          gpsLat: pinLocation?.lat ?? property.gpsLat ?? null,
          gpsLng: pinLocation?.lng ?? property.gpsLng ?? null,
          mapEmbedUrl: pinLocation?.mapEmbedUrl ?? property.mapEmbedUrl ?? null,
          images: [...(coverImage ? [coverImage] : []), ...interiorImages],
        }),
      })
      navigate(`/properties/${id}`)
    } catch (err) {
      setServerError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center">
      <Loader2 className="w-6 h-6 animate-spin text-slate-300" />
    </div>
  )

  if (!property) return null

  const TypeIcon = TYPE_ICON[property.type]
  const d = property.apartment || property.hostel || property.land || property.commercial

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-100 sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 h-16 flex items-center gap-3">
          <button onClick={() => navigate(`/properties/${id}`)} className="text-slate-400 hover:text-slate-600 transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: "var(--accent)" }}>
              <Building2 className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-slate-900">Edit Property</span>
          </div>
          <span className="ml-1 text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 flex items-center gap-1">
            <TypeIcon className="w-3 h-3" />
            {TYPE_LABEL[property.type]}
          </span>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">

          {/* Base details */}
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
                <Input placeholder="e.g. Hyderabad" {...form.register("city")} className="h-10" />
              </Field>
              <Field label="Area / Locality" error={errors.area?.message}>
                <Input placeholder="e.g. Patancheru" {...form.register("area")} className="h-10" />
              </Field>
            </div>
            <Field label="Full address (optional)" error={errors.address?.message}>
              <Input placeholder="e.g. H.No 4-56, Main Road" {...form.register("address")} className="h-10" />
            </Field>

            {/* Location pin */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-violet-500" /> Pin Location on Map
                </Label>
                <button
                  type="button"
                  onClick={() => setShowLocationPicker(v => !v)}
                  className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg border transition-colors border-violet-300 bg-violet-50 text-violet-700 hover:bg-violet-100"
                >
                  <MapPin className="w-3 h-3" />
                  {showLocationPicker ? "Close Map" : (pinLocation?.lat ? "Update Location" : "Set Location")}
                  <ChevronDown className={`w-3 h-3 transition-transform ${showLocationPicker ? "rotate-180" : ""}`} />
                </button>
              </div>
              {(pinLocation?.lat != null || property?.gpsLat != null || pinLocation?.mapEmbedUrl || property?.mapEmbedUrl) && !showLocationPicker && (
                <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-green-50 border border-green-200">
                  <MapPin className="w-3.5 h-3.5 text-green-600 shrink-0" />
                  <span className="text-xs text-green-700 font-medium">
                    {(pinLocation?.lat ?? property?.gpsLat) != null
                      ? `Location fixed · ${(pinLocation?.lat ?? property?.gpsLat).toFixed(5)}, ${(pinLocation?.lng ?? property?.gpsLng).toFixed(5)}`
                      : "Location fixed · custom Google Maps embed"}
                  </span>
                </div>
              )}
              {showLocationPicker && (
                <LocationPicker
                  onSelect={(loc) => { setPinLocation(loc); setShowLocationPicker(false) }}
                  initialCoords={pinLocation?.lat ? { lat: pinLocation.lat, lng: pinLocation.lng } : null}
                  initialAddress={pinLocation?.address || ""}
                  initialEmbedUrl={pinLocation?.mapEmbedUrl || null}
                />
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <Field label={form.watch("type") === "LAND" ? "Price (₹ total)" : "Price (₹ / month)"} error={errors.price?.message}>
                <Input type="number" placeholder="e.g. 15000" {...form.register("price")} className="h-10" />
              </Field>
              <Field label="Number of Vacancies" error={errors.vacancies?.message}>
                <Input type="number" min={1} placeholder="e.g. 2" {...form.register("vacancies")} className="h-10" />
              </Field>
            </div>
          </div>

          {/* Type-specific details */}
          {d && (
            <div className="bg-white rounded-2xl border border-slate-100 p-6 space-y-4">
              <h2 className="font-semibold text-slate-900">{TYPE_LABEL[property.type]} details</h2>

              {property.type === "APARTMENT" && (
                <div className="grid grid-cols-2 gap-4">
                  <Field label="Rooms (BHK)">
                    <Input type="number" min={1} {...form.register("rooms")} className="h-10" />
                  </Field>
                  <Field label="Bathrooms">
                    <Input type="number" min={1} {...form.register("bathrooms")} className="h-10" />
                  </Field>
                  <Field label="Floor (optional)">
                    <Input type="number" min={0} {...form.register("floor")} className="h-10" />
                  </Field>
                  <Field label="Maintenance ₹/mo (optional)">
                    <Input type="number" min={0} {...form.register("maintenanceCharges")} className="h-10" />
                  </Field>
                  <div className="col-span-2 flex flex-wrap gap-x-6 gap-y-3">
                    <CheckField id="balcony" label="Balcony" checked={form.watch("balcony")} onCheckedChange={(v) => form.setValue("balcony", v)} />
                    <CheckField id="furnished" label="Furnished" checked={form.watch("furnished")} onCheckedChange={(v) => form.setValue("furnished", v)} />
                    <CheckField id="lift" label="Lift / Elevator" checked={form.watch("lift")} onCheckedChange={(v) => form.setValue("lift", v)} />
                  </div>
                </div>
              )}

              {property.type === "HOSTEL" && (
                <div className="grid grid-cols-2 gap-4">
                  <Field label="Gender">
                    <Select value={form.watch("gender")} onValueChange={(v) => form.setValue("gender", v)}>
                      <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="MALE">Male</SelectItem>
                        <SelectItem value="FEMALE">Female</SelectItem>
                        <SelectItem value="MIXED">Mixed</SelectItem>
                      </SelectContent>
                    </Select>
                  </Field>
                  <Field label="Sharing type">
                    <Select value={form.watch("sharing")} onValueChange={(v) => form.setValue("sharing", v)}>
                      <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
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
              )}

              {property.type === "LAND" && (
                <div className="grid grid-cols-2 gap-4">
                  <Field label="Size (acres)">
                    <Input type="number" step="0.01" {...form.register("sizeAcres")} className="h-10" />
                  </Field>
                  <Field label="Land usage">
                    <Select value={form.watch("usage")} onValueChange={(v) => form.setValue("usage", v)}>
                      <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="RESIDENTIAL">Residential</SelectItem>
                        <SelectItem value="COMMERCIAL">Commercial</SelectItem>
                        <SelectItem value="AGRICULTURAL">Agricultural</SelectItem>
                      </SelectContent>
                    </Select>
                  </Field>
                  <div className="col-span-2">
                    <CheckField id="roadAccess" label="Road access available" checked={form.watch("roadAccess")} onCheckedChange={(v) => form.setValue("roadAccess", v)} />
                  </div>
                </div>
              )}

              {property.type === "COMMERCIAL" && (
                <div className="grid grid-cols-2 gap-4">
                  <Field label="Shop / unit type">
                    <Input placeholder="e.g. Retail, Office" {...form.register("shopType")} className="h-10" />
                  </Field>
                  <Field label="Purpose">
                    <Select value={form.watch("purpose") || "COMMERCIAL"} onValueChange={(v) => form.setValue("purpose", v)}>
                      <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="COMMERCIAL">Commercial</SelectItem>
                        <SelectItem value="RESIDENTIAL">Residential</SelectItem>
                      </SelectContent>
                    </Select>
                  </Field>
                  <Field label="Floor area (sq ft)">
                    <Input type="number" step="0.01" {...form.register("floorArea")} className="h-10" />
                  </Field>
                  <Field label="Security deposit (optional)">
                    <Input type="number" {...form.register("securityDeposit")} className="h-10" />
                  </Field>
                </div>
              )}
            </div>
          )}

          {/* Cover Photo */}
          <div className="bg-white rounded-2xl border border-slate-100 p-6 space-y-4">
            <div>
              <h2 className="font-semibold text-slate-900">Cover Photo</h2>
              <p className="text-xs text-slate-400 mt-0.5">First image people see in the listing.</p>
            </div>
            {coverImage ? (
              <div className="relative rounded-xl overflow-hidden border border-slate-100" style={{ height: 200 }}>
                <img src={coverImage} alt="cover" className="w-full h-full object-cover" />
                <button
                  type="button"
                  onClick={() => setCoverImage(null)}
                  className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/50 text-white flex items-center justify-center hover:bg-black/70"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
                <label className="absolute bottom-2 right-2 cursor-pointer">
                  <input type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={handleCoverUpload} disabled={uploadingCover} />
                  <span className="text-xs bg-black/60 text-white px-2.5 py-1 rounded-full hover:bg-black/80 transition-colors">
                    {uploadingCover ? "Uploading…" : "Replace"}
                  </span>
                </label>
                <span className="absolute bottom-2 left-2 text-xs bg-black/50 text-white px-2 py-0.5 rounded-full">Cover</span>
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
              <p className="text-xs text-slate-400 mt-0.5">Rooms, kitchen, bathrooms and other spaces.</p>
            </div>
            {interiorImages.length > 0 && (
              <div className="grid grid-cols-3 gap-2">
                {interiorImages.map((url, i) => (
                  <div key={i} className="relative rounded-xl overflow-hidden border border-slate-100 aspect-square">
                    <img src={url} alt={`interior ${i + 1}`} className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => setInteriorImages(prev => prev.filter((_, j) => j !== i))}
                      className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-black/50 text-white flex items-center justify-center hover:bg-black/70"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
            <label className={`flex flex-col items-center justify-center gap-2 border-2 border-dashed rounded-xl p-6 cursor-pointer transition-colors ${uploadingInterior ? "border-slate-200 bg-slate-50" : "border-slate-300 hover:border-violet-400 hover:bg-violet-50"}`}>
              <input type="file" accept="image/jpeg,image/png,image/webp" multiple className="hidden" onChange={handleInteriorUpload} disabled={uploadingInterior} />
              {uploadingInterior ? <Loader2 className="w-6 h-6 text-slate-400 animate-spin" /> : <UploadCloud className="w-6 h-6 text-slate-400" />}
              <span className="text-sm text-slate-500">{uploadingInterior ? "Uploading…" : "Add more photos"}</span>
              <span className="text-xs text-slate-400">JPEG, PNG, WebP · Max 10MB each · Multiple allowed</span>
            </label>
            {uploadError && <p className="text-xs text-red-500">{uploadError}</p>}
          </div>

          {serverError && (
            <div className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-4 py-3">
              {serverError}
            </div>
          )}

          <div className="flex gap-3">
            <Button type="button" variant="outline" className="flex-1" onClick={() => navigate(`/properties/${id}`)}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={submitting}
              className="flex-1 h-11 text-white"
              style={{ background: "var(--accent)" }}
            >
              {submitting && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
              {submitting ? "Saving…" : "Save changes"}
            </Button>
          </div>
        </form>
      </main>
    </div>
  )
}
