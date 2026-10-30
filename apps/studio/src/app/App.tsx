import { createBrowserRouter, RouterProvider } from "react-router";
import { HomePage } from "@/pages/home";

const router = createBrowserRouter([{ path: "/", Component: HomePage }]);

export function App() {
  return <RouterProvider router={router} />;
}
