export const repository = "https://github.com/yohanvillarp/offscript";
export const npmPackage = "https://www.npmjs.com/package/@nikelyh/offscript?activeTab=readme";
export const sourceDoc = (file: string) => `${repository}/blob/main/docs/${file}`;

export const navItems = [
  { path: "/", label: "Overview" },
  { path: "/how-it-works", label: "How it works" },
  { path: "/get-started", label: "Get started" },
  { path: "/reference", label: "Reference" },
] as const;
