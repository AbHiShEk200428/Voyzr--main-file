import React from "react";
import {
  ComposableMap,
  Geographies,
  Geography,
  Sphere,
  Graticule
} from "react-simple-maps";
import { motion } from "framer-motion";

const geoUrl = "https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json";

interface InteractiveWorldMapProps {
  highlightedRegions: string[];
}

export function InteractiveWorldMap({ highlightedRegions }: InteractiveWorldMapProps) {
  // Simple heuristic to match region names to ISO codes or country names
  // In a real app, you'd have a mapping table.
  const isHighlighted = (geo: any) => {
    const name = geo.properties.name.toLowerCase();
    return highlightedRegions.some(region => 
      name.includes(region.toLowerCase()) || region.toLowerCase().includes(name)
    );
  };

  return (
    <div className="w-full h-full min-h-[200px] bg-slate-900/5 rounded-3xl overflow-hidden p-4">
      <ComposableMap
        projectionConfig={{
          rotate: [-10, 0, 0],
          scale: 147
        }}
        width={800}
        height={400}
        style={{ width: "100%", height: "auto" }}
      >
        <Sphere stroke="#E4E8ED" strokeWidth={0.5} id="sphere" fill="transparent" />
        <Graticule stroke="#E4E8ED" strokeWidth={0.5} />
        <Geographies geography={geoUrl}>
          {({ geographies }) =>
            geographies.map((geo) => {
              const highlighted = isHighlighted(geo);
              return (
                <Geography
                  key={geo.rsmKey}
                  geography={geo}
                  fill={highlighted ? "#4F46E5" : "#F1F5F9"}
                  stroke="#D1D5DB"
                  strokeWidth={0.5}
                  style={{
                    default: { outline: "none" },
                    hover: { fill: highlighted ? "#4338CA" : "#E2E8F0", outline: "none" },
                    pressed: { outline: "none" },
                  }}
                />
              );
            })
          }
        </Geographies>
      </ComposableMap>
    </div>
  );
}
