import type { MetadataRoute } from "next"

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Set Tracker",
    short_name: "Set Tracker",
    description: "Simple workout tracking for the gym",
    start_url: "/dashboard",
    display: "standalone",
    background_color: "#000000",
    theme_color: "#000000",
  }
}
