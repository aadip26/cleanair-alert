export interface PlaceSeed {
  slug: string;
  name: string;
  state: string;
  latitude: number;
  longitude: number;
  cpcbCity: string | null;
}

export const PLACES: PlaceSeed[] = [
  { slug: "delhi", name: "Delhi", state: "Delhi", latitude: 28.6139, longitude: 77.209, cpcbCity: "Delhi" },
  { slug: "gurugram", name: "Gurugram", state: "Haryana", latitude: 28.4595, longitude: 77.0266, cpcbCity: "Gurugram" },
  { slug: "noida", name: "Noida", state: "Uttar Pradesh", latitude: 28.5355, longitude: 77.391, cpcbCity: "Noida" },
  { slug: "mumbai", name: "Mumbai", state: "Maharashtra", latitude: 19.076, longitude: 72.8777, cpcbCity: "Mumbai" },
  { slug: "bengaluru", name: "Bengaluru", state: "Karnataka", latitude: 12.9716, longitude: 77.5946, cpcbCity: "Bengaluru" },
  { slug: "kolkata", name: "Kolkata", state: "West Bengal", latitude: 22.5726, longitude: 88.3639, cpcbCity: "Kolkata" },
  { slug: "chennai", name: "Chennai", state: "Tamil Nadu", latitude: 13.0827, longitude: 80.2707, cpcbCity: "Chennai" },
  { slug: "hyderabad", name: "Hyderabad", state: "Telangana", latitude: 17.385, longitude: 78.4867, cpcbCity: "Hyderabad" },
  { slug: "jaipur", name: "Jaipur", state: "Rajasthan", latitude: 26.9124, longitude: 75.7873, cpcbCity: "Jaipur" },
  { slug: "chandigarh", name: "Chandigarh", state: "Chandigarh", latitude: 30.7333, longitude: 76.7794, cpcbCity: "Chandigarh" },
  { slug: "pune", name: "Pune", state: "Maharashtra", latitude: 18.5204, longitude: 73.8567, cpcbCity: "Pune" },
  { slug: "nagpur", name: "Nagpur", state: "Maharashtra", latitude: 21.1458, longitude: 79.0882, cpcbCity: "Nagpur" },
  { slug: "nashik", name: "Nashik", state: "Maharashtra", latitude: 19.9975, longitude: 73.7898, cpcbCity: "Nashik" },
  { slug: "chhatrapati-sambhajinagar", name: "Chhatrapati Sambhajinagar", state: "Maharashtra", latitude: 19.8762, longitude: 75.3433, cpcbCity: "Aurangabad" },
  { slug: "kolhapur", name: "Kolhapur", state: "Maharashtra", latitude: 16.705, longitude: 74.2433, cpcbCity: "Kolhapur" },
];

export function getPlace(slug: string): PlaceSeed | undefined {
  return PLACES.find((p) => p.slug === slug);
}
