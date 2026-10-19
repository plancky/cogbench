import { useEffect, useState } from "react"
import { Toaster as Sonner, type ToasterProps } from "sonner"
import { CircleCheckIcon, InfoIcon, TriangleAlertIcon, OctagonXIcon, Loader2Icon } from "lucide-react"

function useSystemTheme(): "light" | "dark" {
  const q = "(prefers-color-scheme: dark)"
  const [dark, setDark] = useState(() => window.matchMedia(q).matches)
  useEffect(() => {
    const mql = window.matchMedia(q)
    const on = (e: MediaQueryListEvent) => setDark(e.matches)
    mql.addEventListener("change", on)
    return () => mql.removeEventListener("change", on)
  }, [])
  return dark ? "dark" : "light"
}

const Toaster = ({ ...props }: ToasterProps) => {
  const theme = useSystemTheme()

  return (
    <Sonner
      theme={theme}
      className="toaster group"
      icons={{
        success: <CircleCheckIcon className="size-4" />,
        info: <InfoIcon className="size-4" />,
        warning: <TriangleAlertIcon className="size-4" />,
        error: <OctagonXIcon className="size-4" />,
        loading: <Loader2Icon className="size-4 animate-spin" />,
      }}
      style={
        {
          "--normal-bg": "var(--popover)",
          "--normal-text": "var(--popover-foreground)",
          "--normal-border": "var(--border)",
          "--border-radius": "var(--radius)",
        } as React.CSSProperties
      }
      toastOptions={{ classNames: { toast: "cn-toast" } }}
      {...props}
    />
  )
}

export { Toaster }
