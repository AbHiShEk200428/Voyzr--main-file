import os
import requests
from typing import List, Dict, Any, Tuple

class TripPlannerEngine:
    """
    Trip Planner Engine integrating multiple Geoapify features.
    Configured to draw keys from environment variables or a fallback dictionary.
    """
    
    def __init__(self, api_keys: Dict[str, str] = None):
        """
        Initialize the engine with specific API keys.
        """
        # Fallback dictionary if env vars are not set
        default_keys = {
            "PLACES_KEY": "87ad5a2920494346a047c4f880aa306e",
            "ROUTE_PLANNER_KEY": "d01f3dd9b95d4efe8cc574103fb609b4",
            "STATIC_MAP_KEY": "6de209a5add94a398bfea16528c7981b",
            "MARKER_ICON_KEY": "24890b7d41b14db1b5f082843b1f5922",
            "ROUTING_KEY": "81577060081b47b484e922133c235b16"
        }
        
        self.keys = api_keys or {
            k: os.environ.get(f"GEOAPIFY_{k}", v) for k, v in default_keys.items()
        }
        
        # Base URLs for Geoapify Services
        self.BASE_URL_PLACES = "https://api.geoapify.com/v2/places"
        self.BASE_URL_OPTIMIZE = "https://api.geoapify.com/v1/routeplanner"
        self.BASE_URL_ROUTING = "https://api.geoapify.com/v1/routing"
        self.BASE_URL_STATIC_MAP = "https://maps.geoapify.com/v1/staticmap"
        self.BASE_URL_MARKER = "https://api.geoapify.com/v1/icon/"

    # 1. Places API: Discovery Mode
    def discover_places(self, category: str, lat: float, lon: float, radius: int = 5000, limit: int = 5) -> List[Dict[str, Any]]:
        """Finds attractions, restaurants, etc., based on category and radius."""
        params = {
            "categories": category,
            "filter": f"circle:{lon},{lat},{radius}",
            "limit": limit,
            "apiKey": self.keys["PLACES_KEY"]
        }
        response = requests.get(self.BASE_URL_PLACES, params=params)
        response.raise_for_status()
        
        data = response.json()
        results = []
        for feature in data.get("features", []):
            props = feature.get("properties", {})
            results.append({
                "name": props.get("name", "Unnamed Place"),
                "lat": props.get("lat"),
                "lon": props.get("lon"),
                "address": props.get("formatted")
            })
        return results

    # 2. Route Planner API: Itinerary Optimizer
    def optimize_itinerary(self, locations: List[Tuple[float, float]], mode: str = "drive") -> Dict[str, Any]:
        """
        Takes a list of (lat, lon) tuples and returns the most efficient order to visit them (TSP solver).
        Geoapify optimization requires waypoints in [lon, lat] format.
        """
        payload = {
            "mode": mode,
            "agents": [{"start_location": [locations[0][1], locations[0][0]]}],
            "jobs": [{"location": [lon, lat]} for lat, lon in locations[1:]]
        }
        params = {"apiKey": self.keys["ROUTE_PLANNER_KEY"]}
        
        response = requests.post(self.BASE_URL_OPTIMIZE, json=payload, params=params)
        if not response.ok:
            print(f"Error from Route Planner API: {response.text}")
        response.raise_for_status()
        
        data = response.json()
        
        # Extract optimized order and geometry
        optimized_order = []
        path_geometry = None
        
        if "features" in data and len(data["features"]) > 0:
            feature = data["features"][0]
            # Get the reordered waypoints index array
            waypoint_indices = feature.get("properties", {}).get("waypoints", [])
            
            # Extract sequence (Geoapify returns an array of evaluated waypoints in order)
            for wp in waypoint_indices:
                orig_loc = wp.get("original_location")  # [lon, lat]
                if orig_loc:
                    optimized_order.append((orig_loc[1], orig_loc[0])) # Convert back to (lat, lon)
                
        return {
            "optimized_order": optimized_order,
            "optimization_data": data  # Raw data might contain summary
        }

    # 5. Routing API: Navigation Engine
    def get_directions(self, waypoints: List[Tuple[float, float]], mode: str = "drive") -> Dict[str, Any]:
        """
        Get the actual geometry (path) and turn-by-turn directions between points.
        Waypoints must be passed as lat,lon|lat,lon...
        """
        # Geoapify routing uses lat,lon format in the URL params
        waypoints_str = "|".join([f"{lat},{lon}" for lat, lon in waypoints])
        
        params = {
            "waypoints": waypoints_str,
            "mode": mode,
            "apiKey": self.keys["ROUTING_KEY"]
        }
        
        response = requests.get(self.BASE_URL_ROUTING, params=params)
        response.raise_for_status()
        return response.json()

    # 4. Marker Icon API: Custom Visuals
    def generate_marker_url(self, color: str = "red", icon: str = "utensils", size: str = "large") -> str:
        """
        Generates a URL for a custom marker icon.
        """
        params = {
            "type": "awesome",
            "color": color,
            "icon": icon,
            "size": size,
            "iconSize": "large",
            "apiKey": self.keys["MARKER_ICON_KEY"]
        }
        
        # We manually build the URL string because the Static Map API needs the URL passed inside its markers parameter
        req = requests.Request('GET', self.BASE_URL_MARKER, params=params)
        prep = req.prepare()
        return prep.url

    # 3. Static Map API: Map Snapshot
    def generate_static_map(self, center_lat: float, center_lon: float, markers: List[Dict[str, Any]], zoom: int = 12, width: int = 800, height: int = 600) -> str:
        """
        Generates a Static Map URL representing the snapshot of the trip.
        markers should be a list of dicts like {"lat": 1.2, "lon": 3.4, "icon_url": "http..."}
        """
        # Format the markers parameter
        # Format: lon,lat;type:material;color:red;icon:circle|lon,lat;...
        # OR we can pass a custom URL: lon,lat;icon:URL
        
        marker_str_list = []
        for m in markers:
            lon, lat = m["lon"], m["lat"]
            icon_url = m.get("icon_url")
            
            if icon_url:
                # Geoapify expects icon URLs to be URL-encoded
                import urllib.parse
                encoded_url = urllib.parse.quote_plus(icon_url)
                marker_str_list.append(f"{lon},{lat};icon:{encoded_url}")
            else:
                marker_str_list.append(f"{lon},{lat};type:awesome;color:red;size:large")
                
        markers_param = "|".join(marker_str_list)

        params = {
            "style": "osm-carto",
            "width": width,
            "height": height,
            "center": f"lonlat:{center_lon},{center_lat}",
            "zoom": zoom,
            "marker": markers_param,
            "apiKey": self.keys["STATIC_MAP_KEY"]
        }
        
        req = requests.Request('GET', self.BASE_URL_STATIC_MAP, params=params)
        prep = req.prepare()
        return prep.url


# --- Main Workflow Demonstration ---
if __name__ == "__main__":
    print("--- Initializing Smart Trip Planner Engine ---")
    planner = TripPlannerEngine()
    
    # 1. Starting Point: San Francisco (Lat, Lon)
    start_lat, start_lon = 37.7749, -122.4194
    print(f"\n1. Disovering restaurants near San Francisco ({start_lat}, {start_lon})...")
    
    # Discovery Mode: Search Places
    places = planner.discover_places(category="catering.restaurant", lat=start_lat, lon=start_lon, radius=3000, limit=3)
    
    locations_to_visit = [(start_lat, start_lon)]  # Start point
    for p in places:
        print(f" - Found: {p['name']} at {p['lat']}, {p['lon']}")
        locations_to_visit.append((p['lat'], p['lon']))
        
    print(f"\n2. Optimizing Itinerary for {len(locations_to_visit)} stops...")
    
    # Itinerary Optimizer: Route Planner
    optimization_result = planner.optimize_itinerary(locations_to_visit)
    optimized_order = optimization_result["optimized_order"]
    
    print(" - Optimized Order of Visit:")
    for i, (lat, lon) in enumerate(optimized_order):
        print(f"   Stop {i+1}: ({lat}, {lon})")
        
    print("\n3. Generating Turn-by-Turn Navigation...")
    
    # Navigation Engine: Routing API
    routing_result = planner.get_directions(optimized_order)
    features = routing_result.get("features", [])
    if features:
        distance = features[0].get("properties", {}).get("distance", 0) / 1000
        time = features[0].get("properties", {}).get("time", 0) / 60
        print(f" - Total Route Distance: {distance:.2f} km")
        print(f" - Total Estimated Time: {time:.2f} minutes")
    
    print("\n4. Generating Static Map Snapshot with Custom Markers...")
    
    # Custom Visuals: Generate Marker URLs
    start_icon = planner.generate_marker_url(color="green", icon="play", size="x-large")
    restaurant_icon = planner.generate_marker_url(color="orange", icon="utensils", size="large")
    
    # Prepare markers for Static Map
    map_markers = []
    
    # Add Start Point
    map_markers.append({
        "lat": optimized_order[0][0],
        "lon": optimized_order[0][1],
        "icon_url": start_icon
    })
    
    # Add Restaurants
    for lat, lon in optimized_order[1:]:
        map_markers.append({
            "lat": lat,
            "lon": lon,
            "icon_url": restaurant_icon
        })
        
    # Map Snapshot: Static Map API
    map_image_url = planner.generate_static_map(
        center_lat=start_lat, 
        center_lon=start_lon, 
        markers=map_markers,
        zoom=13
    )
    
    print(f" - Map Image URL generated successfully!")
    print(f" - URL: {map_image_url}\n")
    print("--- Workflow Complete ---")
