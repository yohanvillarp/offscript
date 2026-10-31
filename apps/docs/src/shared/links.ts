export const repository = "https://github.com/yohanvillarp/offscript";
export const npmPackage = "https://www.npmjs.com/package/@nikelyh/offscript?activeTab=readme";
export const sourceDoc = (file: string) => `${repository}/blob/main/docs/${file}`;
export const sections = [
  { id: "how-it-works", label: "How it works" },
  { id: "get-started", label: "Get started" },
  { id: "reference", label: "Reference" },
] as const;
