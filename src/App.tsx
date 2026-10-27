import { RouterProvider } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { ToastProvider } from "@/contexts/ToastContext";
import { router } from "@/routes/router";
import { CartProvider } from "./contexts/CartContext";

export default function App() {
  return (
    <ToastProvider>
      <AuthProvider>
        <CartProvider>
        <RouterProvider router={router} />
        </CartProvider>
      </AuthProvider>
    </ToastProvider>
  );
}
