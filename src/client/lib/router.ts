import { useSyncExternalStore } from "react";

function current(): string {
  return location.hash.replace(/^#\/?/, "");
}

export function useRoute(): string[] {
  const path = useSyncExternalStore(
    (l) => (window.addEventListener("hashchange", l), () => window.removeEventListener("hashchange", l)),
    current,
  );
  return path.split("/").filter(Boolean).map(decodeURIComponent);
}

export function navigate(path: string): void {
  location.hash = `#/${path.replace(/^\//, "")}`;
}

export const href = (path: string) => `#/${path.replace(/^\//, "")}`;
