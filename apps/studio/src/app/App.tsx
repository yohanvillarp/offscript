import { useEffect } from "react";
import { createBrowserRouter, Outlet, RouterProvider, ScrollRestoration, useLocation } from "react-router";
import { HomePage } from "@/pages/home";
import { NewSimulationPage } from "@/pages/new-simulation";

function RootLayout() {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "instant" });
  }, [pathname]);

  return (
    <>
      <ScrollRestoration />
      <Outlet />
    </>
  );
}

const router = createBrowserRouter([
  {
    element: <RootLayout />,
    children: [
      { path: "/", Component: HomePage },
      { path: "/simulations/new", Component: NewSimulationPage },
    ],
  },
]);

export function App() {
  return <RouterProvider router={router} />;
}
