import requests
import random
import json
import time

def get_thumbnail(title):
    try:
        url = "https://en.wikipedia.org/w/api.php"
        params = {
            "action": "query",
            "titles": title,
            "prop": "pageimages",
            "format": "json",
            "pithumbsize": 1000
        }
        headers = {"User-Agent": "VoyzrBot/1.0 (contact: info@voyzr.com)"}
        response = requests.get(url, params=params, headers=headers, timeout=10)
        data = response.json()
        pages = data.get("query", {}).get("pages", {})
        for page_id in pages:
            if "thumbnail" in pages[page_id]:
                return pages[page_id]["thumbnail"]["source"]
    except Exception as e:
        print(f"Error fetching thumbnail for {title}: {e}")
    return "https://images.unsplash.com/photo-1602216056096-3b40cc0c9944?auto=format&fit=crop&q=80&w=1000"

def geocode(name, district, api_key):
    try:
        query = f"{name}, {district}, Kerala, India"
        url = f"https://api.geoapify.com/v1/geocode/search?text={query}&limit=1&apiKey={api_key}"
        response = requests.get(url, timeout=10)
        data = response.json()
        if data.get("features"):
            feature = data["features"][0]
            lat = feature["geometry"]["coordinates"][1]
            lng = feature["geometry"]["coordinates"][0]
            address = feature["properties"].get("formatted", f"{name}, {district}, Kerala, India")
            return lat, lng, address
    except Exception as e:
        print(f"Error geocoding {name}: {e}")
    return None, None, f"{name}, {district}, Kerala, India"

def generate_description(name, district):
    templates = [
        "Experience the vibrant atmosphere and picturesque surroundings of {name} in {district}.",
        "Iconic {name} offering a unique cultural and scenic experience in {district}, Kerala.",
        "Serene {name} providing a perfect escape with stunning views and local charm in {district}.",
        "Must-visit {name} known for its historical significance and natural beauty in {district}."
    ]
    return random.choice(templates).format(name=name, district=district)

api_key = "87ad5a2920494346a047c4f880aa306e"

districts = {
    "Kottayam": [
        "Kumarakom Bird Sanctuary", "Vembanad Lake", "Illikkal Kallu", "Ilaveezhapoonchira", 
        "Marmala Waterfalls", "Aruvikkuzhi Waterfalls", "Vagamon", "Kuttikkanam", 
        "Poonjar Palace", "Bay Island Driftwood Museum", "St Mary’s Church (Cheriapally)", 
        "St Mary’s Church (Vallarpadam area connection)", "Thazhathangady Mosque", "Kottayam Public Library"
    ],
    "Idukki": [
        "Munnar", "Eravikulam National Park", "Mattupetty Dam", "Echo Point", 
        "Top Station", "Anamudi Peak", "Devikulam", "Attukad Waterfalls", 
        "Cheeyappara Waterfalls", "Valara Waterfalls", "Thekkady", "Periyar Wildlife Sanctuary", 
        "Idukki Arch Dam", "Calvary Mount", "Ramakkalmedu", "Chathurangapara Viewpoint", 
        "Anchuruli Tunnel", "Hill View Park", "Kulamavu Dam", "Meesapulimala"
    ],
    "Ernakulam": [
        "Fort Kochi", "Chinese Fishing Nets", "Mattancherry Palace", "Jewish Synagogue", 
        "Marine Drive Kochi", "Bolgatty Palace", "Vypin Island", "Cherai Beach", 
        "Lulu Mall", "Hill Palace Museum", "Thattekad Bird Sanctuary", "Mangalavanam Bird Sanctuary", 
        "Santa Cruz Basilica", "St Francis Church", "Willingdon Island", "Kadamakkudy Islands", 
        "Chottanikkara Temple", "Athirapally (border area access)"
    ]
}

sql_file = "batch_4_kott_iduk_ernak.sql"

with open(sql_file, "w", encoding="utf-8") as f:
    for district, attractions in districts.items():
        print(f"Processing {district}...")
        for name in attractions:
            # Clean name for searching
            search_name = name.split("(")[0].strip()
            
            lat, lng, address = geocode(search_name, district, api_key)
            if lat is None or lng is None:
                # Try geocoding without district if it failed
                lat, lng, address = geocode(search_name, "Kerala", api_key)
            
            image_url = get_thumbnail(search_name)
            rating = round(random.uniform(4.5, 5.0), 1)
            description = generate_description(name, district)
            
            # Escape single quotes in name, description, address
            ename = name.replace("'", "''")
            edescription = description.replace("'", "''")
            eaddress = address.replace("'", "''")
            
            sql = f"INSERT INTO attractions (name, description, category, address, lat, lng, rating, image_url, is_verified) VALUES ('{ename}', '{edescription}', 'LANDMARK', '{eaddress}', {lat if lat else 0.0}, {lng if lng else 0.0}, {rating}, '{image_url}', true);\n"
            f.write(sql)
            time.sleep(0.2) # To avoid hitting rate limits

print(f"Done! Output saved to {sql_file}")
