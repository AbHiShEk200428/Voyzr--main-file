import requests
import random
import time
import json

GEOAPIFY_KEY = "87ad5a2920494346a047c4f880aa306e"

attractions = [
    # Pathanamthitta
    "Sabarimala Temple, Pathanamthitta",
    "Perunthenaruvi Waterfalls, Pathanamthitta",
    "Gavi, Pathanamthitta",
    "Konni Elephant Camp, Pathanamthitta",
    "Achankovil River, Pathanamthitta",
    "Kakki Reservoir, Pathanamthitta",
    "Pamba River, Pathanamthitta",
    "Aranmula Parthasarathy Temple, Pathanamthitta",
    "Aranmula Boat Race Area, Pathanamthitta",
    "Charalkunnu Viewpoint, Pathanamthitta",
    "Kakki Dam, Pathanamthitta",
    "Kakki-Anathode Dam, Pathanamthitta",
    "Periyar Tiger Reserve, Pathanamthitta",
    "Kumbhavurutty Falls, Pathanamthitta",
    "Maniyar Dam, Pathanamthitta",
    # Alappuzha
    "Alappuzha Beach, Alappuzha",
    "Alappuzha Lighthouse, Alappuzha",
    "Vembanad Lake, Alappuzha",
    "Kuttanad, Alappuzha",
    "Marari Beach, Alappuzha",
    "Pathiramanal Island, Alappuzha",
    "Kuttanad Backwaters, Alappuzha",
    "Kumarakom Backwaters, Alappuzha",
    "Ambalappuzha Temple, Alappuzha",
    "Krishnapuram Palace, Alappuzha",
    "Karumadikuttan Statue, Alappuzha",
    "Mullakkal Temple, Alappuzha",
    "Andhakaranazhi Beach, Alappuzha",
    "Thottappally Beach, Alappuzha",
    "Punnamada Lake, Alappuzha"
]

def geocode(name):
    # Added Kerala, India for better accuracy
    search_query = f"{name}, Kerala, India"
    url = f"https://api.geoapify.com/v1/geocode/search?text={search_query}&apiKey={GEOAPIFY_KEY}"
    try:
        response = requests.get(url)
        data = response.json()
        if data['features']:
            lon = data['features'][0]['geometry']['coordinates'][0]
            lat = data['features'][0]['geometry']['coordinates'][1]
            return lat, lon
    except Exception as e:
        print(f"Error geocoding {name}: {e}")
    return None, None

def get_wiki_thumbnail(name):
    search_name = name.split(',')[0]
    # Wikipedia API sometimes fails with direct titles, try search first if needed, 
    # but here we'll just try to handle the JSON error by checking response content type
    url = f"https://en.wikipedia.org/w/api.php?action=query&titles={search_name}&prop=pageimages&format=json&pithumbsize=500&redirects=1"
    try:
        response = requests.get(url, timeout=5)
        if response.status_code == 200:
            data = response.json()
            pages = data['query']['pages']
            for page_id in pages:
                if 'thumbnail' in pages[page_id]:
                    return pages[page_id]['thumbnail']['source']
    except Exception:
        pass
    return "https://images.unsplash.com/photo-1602216056096-3b40cc0c9944?auto=format&fit=crop&q=80" # Fallback

def generate_description(name):
    name_clean = name.split(',')[0]
    tactical_descriptions = {
        "Sabarimala Temple": "Iconic hilltop shrine. Spiritual center. Dense forest trek.",
        "Perunthenaruvi Waterfalls": "Majestic rocky falls. Scenic picnic spot. Natural beauty.",
        "Gavi": "Eco-tourism hub. Wildlife sightings. Mist-clad hills.",
        "Konni Elephant Camp": "Elephant training center. Jungle safaris. Eco-tourism destination.",
        "Achankovil River": "Serene waterway. Religious significance. Lush green banks.",
        "Kakki Reservoir": "Expansive water body. Forest surroundings. High-altitude dam.",
        "Pamba River": "Holy river. Sabarimala gateway. Picturesque landscapes.",
        "Aranmula Parthasarathy Temple": "Ancient Krishna temple. Heritage site. Aranmula mirror origin.",
        "Aranmula Boat Race Area": "Traditional racing venue. Cultural hotspot. Pamba riverfront.",
        "Charalkunnu Viewpoint": "Panoramic valley views. Trekking trails. Peaceful retreat.",
        "Kakki Dam": "Engineering marvel. Forest-locked reservoir. Strategic utility.",
        "Kakki-Anathode Dam": "Twin dam system. Hydroelectric power source. Stunning vistas.",
        "Periyar Tiger Reserve": "Wildlife sanctuary. Tiger habitat. Boat safaris.",
        "Kumbhavurutty Falls": "Forest waterfall. Therapeutic waters. Nature trail.",
        "Maniyar Dam": "Irrigation dam. Scenic backdrop. Quiet getaway.",
        "Alappuzha Beach": "Golden sands. Historic pier. Sunset views.",
        "Alappuzha Lighthouse": "Victorian era structure. Panoramic coastal views. Maritime history.",
        "Vembanad Lake": "Largest lake in Kerala. Backwater hub. Bird watching.",
        "Kuttanad": "Rice bowl of Kerala. Below sea level farming. Watery landscape.",
        "Marari Beach": "Quiet fishing village beach. Pristine sands. Relaxation spot.",
        "Pathiramanal Island": "Bird watcher's paradise. Remote island. Vembanad lake gem.",
        "Kuttanad Backwaters": "Labyrinthine canals. Houseboat cruises. Rural life.",
        "Kumarakom Backwaters": "Luxury backwater destination. Mangrove forests. Serene environment.",
        "Ambalappuzha Temple": "Historic Krishna temple. Famous Palpayasam. Architectural beauty.",
        "Krishnapuram Palace": "Kayamkulam kings' palace. Mural paintings. Museum.",
        "Karumadikuttan Statue": "Ancient Buddhist statue. Black granite. Historical relic.",
        "Mullakkal Temple": "Heart of Alappuzha. Devi temple. Cultural center.",
        "Andhakaranazhi Beach": "Azhi (estuary) location. Scenic beach. Fishing spot.",
        "Thottappally Beach": "Spillway location. Coastal beauty. Quiet sands.",
        "Punnamada Lake": "Nehru Trophy venue. Backwater expanse. Vibrant atmosphere."
    }
    return tactical_descriptions.get(name_clean, f"Popular landmark in {name.split(',')[1].strip()}. Scenic and historic.")

sql_inserts = []
for name in attractions:
    lat, lon = geocode(name)
    
    thumb = get_wiki_thumbnail(name)
    rating = round(random.uniform(4.5, 5.0), 1)
    description = generate_description(name)
    category = "LANDMARK"
    name_clean = name.split(',')[0].replace("'", "''")
    description = description.replace("'", "''")
    
    if lat and lon:
        sql = f"INSERT INTO attractions (name, category, description, rating, latitude, longitude, image_url) VALUES ('{name_clean}', '{category}', '{description}', {rating}, {lat}, {lon}, '{thumb}');"
        sql_inserts.append(sql)
        print(f"Generated for {name_clean} at {lat}, {lon}")
    else:
        print(f"Failed to geocode {name}")
    
    time.sleep(0.2) # Be nice to API

with open("batch_3_path_alap.sql", "w") as f:
    f.write("\n".join(sql_inserts))

print("Done! SQL saved to batch_3_path_alap.sql")
