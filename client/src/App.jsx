import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom"
import LoginPage from "./pages/LoginPage"
import VerifyPage from "./pages/VerifyPage"
import Dashboard from "./pages/Dashboard"
import PropertiesPage from "./pages/PropertiesPage"
import CreatePropertyPage from "./pages/CreatePropertyPage"
import PropertyDetailPage from "./pages/PropertyDetailPage"
import EditPropertyPage from "./pages/EditPropertyPage"
import BookingsPage from "./pages/BookingsPage"
import RequestsPage from "./pages/RequestsPage"
import NotificationsPage from "./pages/NotificationsPage"
import WishlistPage from "./pages/WishlistPage"

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/verify" element={<VerifyPage />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/properties" element={<PropertiesPage />} />
        <Route path="/properties/new" element={<CreatePropertyPage />} />
        <Route path="/properties/:id" element={<PropertyDetailPage />} />
        <Route path="/properties/:id/edit" element={<EditPropertyPage />} />
        <Route path="/bookings" element={<BookingsPage />} />
        <Route path="/requests" element={<RequestsPage />} />
        <Route path="/notifications" element={<NotificationsPage />} />
        <Route path="/wishlist" element={<WishlistPage />} />
      </Routes>
    </BrowserRouter>
  )
}
