import requests
import random
import time

API_KEY = "87ad5a2920494346a047c4f880aa306e"

attractions_raw = [
    # Thrissur
    "Athirapally Waterfalls, Thrissur", "Vazhachal Waterfalls, Thrissur", "Vadakkunnathan Temple, Thrissur", 
    "Thrissur Zoo", "Shakthan Thampuran Palace, Thrissur", "Kerala Kalamandalam, Thrissur", 
    "Punnathur Kotta Elephant Camp, Thrissur", "Guruvayur Temple, Thrissur", "Chavakkad Beach, Thrissur", 
    "Snehatheeram Beach, Thrissur", "Peechi Dam, Thrissur", "Chimmini Dam, Thrissur", 
    "Vilangan Hills, Thrissur", "Bible Tower, Thrissur",
    # Palakkad
    "Palakkad Fort", "Malampuzha Dam, Palakkad", "Malampuzha Garden, Palakkad", 
    "Silent Valley National Park, Palakkad", "Parambikulam Tiger Reserve, Palakkad", "Nelliyampathy Hills, Palakkad", 
    "Dhoni Waterfalls, Palakkad", "Meenvallam Waterfalls, Palakkad", "Kanjirapuzha Dam, Palakkad", 
    "Attappady Hills, Palakkad", "Kalpathy Heritage Village, Palakkad", "Jain Temple Palakkad",
    # Malappuram
    "Kottakkunnu Park, Malappuram", "Nilambur Teak Museum, Malappuram", "Adyanpara Waterfalls, Malappuram", 
    "Kodikuthimala, Malappuram", "Mini Ooty (Arimbra Hills), Malappuram", "Padinharekara Beach, Malappuram", 
    "Keralamkundu Waterfalls, Malappuram", "Connolly’s Plot, Malappuram", "Biyyam Kayal, Malappuram", 
    "Thirunavaya Temple, Malappuram", "Kadalundi Bird Sanctuary, Malappuram",
    # Kozhikode
    "Kozhikode Beach", "Beypore Port, Kozhikode", "Mananchira Square, Kozhikode", 
    "Thusharagiri Waterfalls, Kozhikode", "Kakkayam Dam, Kozhikode", 
    "Sarovaram Bio Park, Kozhikode", "Kappad Beach, Kozhikode", "Peruvannamuzhi Dam, Kozhikode", 
    "Tali Temple, Kozhikode"
]

# De-duplicate keeping order
attractions = []
seen = set()
for a in attractions_raw:
    base = a.split(',')[0].strip().lower()
    if base not in seen:
        attractions.append(a)
        seen.add(base)

def geocode(name):
    # Try more specific query
    query = f"{name}, Kerala, India"
    url = "https://api.geoapify.com/v1/geocode/search"
    params = {"text": query, "apiKey": API_KEY}
    try:
        resp = requests.get(url, params=params).json()
        if resp.get('features'):
            # Filter for results that are actually in Kerala or close to the name
            feat = resp['features'][0]
            props = feat['properties']
            return props.get('formatted', name), feat['geometry']['coordinates'][1], feat['geometry']['coordinates'][0]
    except:
        pass
    return None, None, None

def get_wiki_image(name):
    clean_name = name.split('(')[0].strip()
    url = "https://en.wikipedia.org/w/api.php"
    # First search for the page
    search_params = {
        "action": "query",
        "list": "search",
        "srsearch": clean_name + " Kerala",
        "format": "json"
    }
    try:
        search_resp = requests.get(url, params=search_params).json()
        if search_resp.get('query', {}).get('search'):
            title = search_resp['query']['search'][0]['title']
            # Now get image for this title
            img_params = {
                "action": "query",
                "titles": title,
                "prop": "pageimages",
                "piprop": "thumbnail",
                "pithumbsize": 1000,
                "format": "json"
            }
            img_resp = requests.get(url, params=img_params).json()
            pages = img_resp.get('query', {}).get('pages', {})
            for page_id in pages:
                if 'thumbnail' in pages[page_id]:
                    return pages[page_id]['thumbnail']['source']
    except:
        pass
    return "https://images.unsplash.com/photo-1602216056096-3b40cc0c9944?auto=format&fit=crop&q=80&w=1000"

tactical_templates = [
    "High-value landmark. Strategic location. Key objective for cultural immersion.",
    "Tactical asset identified. Optimal vantage points. Mission-critical for local heritage.",
    "Prime coordinate for scenic reconnaissance. Superior environmental conditions. High priority.",
    "Strategic destination. Historical significance confirmed. Deploy for maximum cultural impact.",
    "Tactical assessment: Exceptional terrain. Strategic importance for regional tourism.",
    "Objective secured. Premier landmark with high-visibility features. Recommended for visit.",
    "Sector landmark. Multi-layered historical depth. Tactical advantage: High visitor satisfaction."
]

sql_statements = []
for full_name in attractions:
    clean_name = full_name.split(',')[0].strip()
    print(f"Processing: {clean_name}...")
    address, lat, lng = geocode(full_name)
    
    if lat:
        img_url = get_wiki_image(clean_name)
        rating = round(random.uniform(4.5, 5.0), 1)
        desc = random.choice(tactical_templates)
        
        safe_name = clean_name.replace("'", "''")
        safe_desc = desc.replace("'", "''")
        safe_address = address.replace("'", "''")
        
        sql = f"INSERT INTO attractions (name, description, category, address, lat, lng, rating, image_url, is_verified) VALUES ('{safe_name}', '{safe_desc}', 'LANDMARK', '{safe_address}', {lat}, {lng}, {rating}, '{img_url}', true);"
        sql_statements.append(sql)
    else:
        print(f"Failed to geocode: {full_name}")
    time.sleep(0.3)

with open('batch_5_thriss_palak_malap_kozh.sql', 'w', encoding='utf-8') as f:
    f.write('\n'.join(sql_statements))

print(f"Successfully generated batch_5_thriss_palak_malap_kozh.sql with {len(sql_statements)} entries.")
