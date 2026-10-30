import { createBrowserRouter, RouterProvider } from "react-router";
import { HomePage } from "@/pages/home";
import { NewSimulationPage } from "@/pages/new-simulation";

const router = createBrowserRouter([
  { path: "/", Component: HomePage },
  { path: "/simulations/new", Component: NewSimulationPage },
]);

export function App() {
  return <RouterProvider router={router} />;
}
