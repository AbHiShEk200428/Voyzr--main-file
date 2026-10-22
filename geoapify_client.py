import os
import requests
from dotenv import load_dotenv

# Load environment variables from the frontend directory
load_dotenv(dotenv_path="voyzr-frontend/.env")

class GeoapifyClient:
    def __init__(self):
        # Retrieve keys from environment variables
        self.places_key = os.getenv("GEOAPIFY_PLACES_KEY")
        self.route_planner_key = os.getenv("GEOAPIFY_ROUTE_PLANNER_KEY")
        self.static_map_key = os.getenv("GEOAPIFY_STATIC_MAP_KEY")
        self.marker_icon_key = os.getenv("GEOAPIFY_MARKER_ICON_KEY")
        self.routing_key = os.getenv("GEOAPIFY_ROUTING_KEY")

        if not all([self.places_key, self.route_planner_key, self.static_map_key, self.marker_icon_key, self.routing_key]):
            raise ValueError("One or more Geoapify API keys are missing in .env")

    def _handle_response(self, response):
        """Helper to manage errors and JSON parsing."""
        if response.status_code == 401:
            raise Exception("Invalid API Key or Unauthorized request.")
        if response.status_code == 429:
            raise Exception("API Limit Reached (Geoapify 429).")
        
        response.raise_for_status()
        return response.json()

    def get_places(self, categories: str, filter_val: str, limit: int = 5):
        """
        Search for points of interest.
        Example categories: 'tourism.attraction', 'catering.restaurant'
        Example filter: 'circle:76.2673,9.9312,5000' (lon,lat,radius)
        """
        url = "https://api.geoapify.com/v2/places"
        params = {
            "categories": categories,
            "filter": filter_val,
            "limit": limit,
            "apiKey": self.places_key
        }
        return self._handle_response(requests.get(url, params=params))

    def get_route(self, waypoints: list, mode: str = "drive"):
        """
        Get directions between coordinates.
        Waypoints format: list of "lat,lon" strings or tuples
        """
        waypoint_str = "|".join([f"{w[0]},{w[1]}" if isinstance(w, (list, tuple)) else str(w) for w in waypoints])
        url = "https://api.geoapify.com/v1/routing"
        params = {
            "waypoints": waypoint_str,
            "mode": mode,
            "apiKey": self.routing_key
        }
        return self._handle_response(requests.get(url, params=params))

    def plan_route(self, agents: list, jobs: list, mode: str = "drive"):
        """
        Optimized sequence for multiple stops (VRP).
        agents: list of starting locations
        jobs: list of delivery/stop locations
        """
        url = "https://api.geoapify.com/v1/routeplanner"
        body = {
            "mode": mode,
            "agents": agents,
            "jobs": jobs
        }
        response = requests.post(url, json=body, params={"apiKey": self.route_planner_key})
        return self._handle_response(response)

    def get_marker_url(self, color: str = "red", icon: str = "star", type: str = "material"):
        """
        Generate a URL for a custom marker icon.
        """
        url = f"https://api.geoapify.com/v1/icon/?type={type}&color={color}&icon={icon}&apiKey={self.marker_icon_key}"
        return url

    def get_static_map_url(self, center: list, zoom: int = 12, markers: list = None, width: int = 600, height: int = 400):
        """
        Build a URL for a static map image.
        Markers format: list of {'lat': float, 'lon': float, 'color': str}
        """
        marker_str = ""
        if markers:
            # Simple marker formatting for static map
            parts = []
            for m in markers:
                parts.append(f"lonlat:{m['lon']},{m['lat']};color:{m.get('color', 'red')}")
            marker_str = "|".join(parts)

        url = "https://api.geoapify.com/v1/staticmap"
        params = {
            "style": "osm-bright",
            "width": width,
            "height": height,
            "center": f"lonlat:{center[1]},{center[0]}",
            "zoom": zoom,
            "apiKey": self.static_map_key
        }
        if marker_str:
            params["marker"] = marker_str

        # Build full URL for debugging/frontend usage
        req = requests.Request('GET', url, params=params).prepare()
        return req.url

# ── EXAMPLE CHAINING USAGE ──────────────────────────────────────────────────
if __name__ == "__main__":
    client = GeoapifyClient()
    
    try:
        print("1. Searching for Attractions in Kochi...")
        # Search for attractions within 5km of Kochi
        places = client.get_places("tourism.attraction", "circle:76.2673,9.9312,5000")
        
        if places['features']:
            first_place = places['features'][0]['properties']
            name = first_place.get('name', 'Unknown Landmark')
            lon, lat = first_place['lon'], first_place['lat']
            print(f"   Found: {name} at {lat}, {lon}")

            print("\n2. Getting turn-by-turn route to place...")
            # Route from current user (simulated) to the place
            origin = [9.9312, 76.2673] # Kochi center
            dest = [lat, lon]
            route = client.get_route([origin, dest])
            distance = route['features'][0]['properties']['distance']
            print(f"   Distance: {distance} meters")

            print("\n3. Generating Custom Marker URL...")
            custom_marker = client.get_marker_url(color="blue", icon="pawn")
            print(f"   Marker: {custom_marker}")

            print("\n4. Final Static Map URL...")
            static_map = client.get_static_map_url(
                center=origin, 
                markers=[{'lat': lat, 'lon': lon, 'color': 'blue'}]
            )
            print(f"   View Map: {static_map}")
            
    except Exception as e:
        print(f"Error during execution: {e}")
