import requests
import json
import time

GEOAPIFY_KEY = "87ad5a2920494346a047c4f880aa306e"

places = [
    "Padmanabhaswamy Temple", "Kovalam Beach", "Varkala Beach", "Ponmudi Hill Station", 
    "Neyyar Dam", "Neyyar Wildlife Sanctuary", "Poovar Island", "Veli Tourist Village", 
    "Shankumugham Beach", "Akkulam Lake", "Napier Museum", "Sri Chitra Art Gallery", 
    "Kanakakunnu Palace", "Koyikkal Palace", "Agasthyarkoodam", "Peppara Dam", 
    "Anchuthengu Fort", "Vizhinjam Lighthouse", "Aruvikkara Dam", "Aruvikkara Temple", 
    "Kallar", "Ponmudi Waterfalls", "Meenmutty Falls (TVM)", "Kappil Beach", 
    "Kappil Lake", "Varkala Cliff", "Janardanaswamy Temple", "Sivagiri Mutt", 
    "Ashtamudi Lake", "Kollam Beach", "Thangassery Lighthouse", "Thangassery Fort", 
    "Thenmala Ecotourism", "Palaruvi Waterfalls", "Jatayu Earth’s Center", 
    "Munroe Island", "Kallada River", "Mayyanad Beach", "Sasthamkotta Lake", 
    "Kulathupuzha Temple", "Achankovil Temple", "Shenduruny Wildlife Sanctuary", 
    "Rosemala", "Aryankavu", "Ochira Temple", "Alumkadavu Boat Building Yard", 
    "Thirumullavaram Beach"
]

def get_geocode(name):
    query = f"{name}"
    # Filter for India and bias towards Kerala (approx center 10, 76)
    url = f"https://api.geoapify.com/v1/geocode/search?text={query}&filter=countrycode:in&bias=circle:76.26,10.5,500000&apiKey={GEOAPIFY_KEY}"
    try:
        response = requests.get(url)
        data = response.json()
        if data.get('features'):
            # Try to find a feature that is actually in Kerala
            for feature in data['features']:
                state = feature['properties'].get('state', '')
                if 'Kerala' in state or 'KL' in feature['properties'].get('state_code', ''):
                    lon = feature['geometry']['coordinates'][0]
                    lat = feature['geometry']['coordinates'][1]
                    address = feature['properties'].get('formatted', '')
                    return lat, lon, address
            
            # Fallback to the first result if no state match but it's in India (due to filter)
            feature = data['features'][0]
            lon = feature['geometry']['coordinates'][0]
            lat = feature['geometry']['coordinates'][1]
            address = feature['properties'].get('formatted', '')
            return lat, lon, address
    except Exception as e:
        print(f"Error geocoding {name}: {e}")
    return None, None, ""

def get_wiki_data(name):
    # Remove (TVM) for wiki search
    wiki_name = name.replace("(TVM)", "").strip()
    url = "https://en.wikipedia.org/w/api.php"
    params = {
        "action": "query",
        "format": "json",
        "prop": "pageimages|extracts",
        "exintro": True,
        "explaintext": True,
        "titles": wiki_name,
        "piprop": "original",
        "redirects": 1
    }
    headers = {
        "User-Agent": "VoyzrBot/1.0 (https://voyzr.com; support@voyzr.com)"
    }
    try:
        response = requests.get(url, params=params, headers=headers)
        data = response.json()
        pages = data.get('query', {}).get('pages', {})
        for page_id in pages:
            page = pages[page_id]
            if page_id == "-1":
                continue
            description = page.get('extract', '')[:500].replace("'", "''") # Limit description and escape single quotes
            image_url = page.get('original', {}).get('source', '')
            return description, image_url
    except Exception as e:
        print(f"Error getting wiki data for {name}: {e}")
    return "", ""

sql_statements = []

for place in places:
    print(f"Processing {place}...")
    lat, lng, address = get_geocode(place)
    description, image_url = get_wiki_data(place)
    
    if not lat or not lng:
        print(f"Could not find coordinates for {place}")
        continue

    # Clean up address for SQL
    address = address.replace("'", "''")
    name_escaped = place.replace("'", "''")
    
    # Category mapping (simplified)
    category = "Tourist Attraction"
    if "Beach" in place:
        category = "Beach"
    elif "Temple" in place:
        category = "Religious Site"
    elif "Dam" in place:
        category = "Dam/Lake"
    elif "Lake" in place:
        category = "Dam/Lake"
    elif "Waterfall" in place or "Falls" in place:
        category = "Waterfall"
    elif "Wild" in place or "Sanctuary" in place:
        category = "Wildlife"
    elif "Palace" in place or "Museum" in place or "Fort" in place or "Gallery" in place:
        category = "Culture/History"
    elif "Hill" in place:
        category = "Hill Station"

    sql = f"INSERT INTO attractions (name, description, category, address, lat, lng, rating, image_url, is_verified) VALUES ('{name_escaped}', '{description}', '{category}', '{address}', {lat}, {lng}, 4.5, '{image_url}', true);"
    sql_statements.append(sql)
    time.sleep(0.1) # Small delay to be polite to APIs

with open('kerala_attractions_import.sql', 'w', encoding='utf-8') as f:
    f.write("\n".join(sql_statements))

print("Done! Created kerala_attractions_import.sql")
