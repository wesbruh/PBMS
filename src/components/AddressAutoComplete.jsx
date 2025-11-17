import { useEffect, useRef } from "react";

const GMAPS_URL = (key) => `https://maps.googleapis.com/maps/api/js?key=${key}&libraries=places`;

export default function AddressAutocomplete({ value, onSelect, placeholder="Start typing address..." }){
  const inputRef = useRef(null);
  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

  useEffect(()=>{
    let cleanup = ()=>{};
    (async ()=>{
      if (!window.google?.maps?.places) {
        await new Promise((resolve, reject)=>{
          const s = document.createElement("script");
          s.src = GMAPS_URL(apiKey);
          s.async = true;
          s.onload = resolve;
          s.onerror = reject;
          document.head.appendChild(s);
        });
      }
      const ac = new window.google.maps.places.Autocomplete(inputRef.current, {
        fields: ["formatted_address", "geometry"],
      });
      const listener = ac.addListener("place_changed", ()=>{
        const place = ac.getPlace();
        const formatted = place.formatted_address || inputRef.current.value;
        const lat = place.geometry?.location?.lat();
        const lng = place.geometry?.location?.lng();
        onSelect?.({ address: formatted, latitude: lat ?? null, longitude: lng ?? null });
      });
      cleanup = ()=> { window.google.maps.event.removeListener(listener); };
    })().catch(console.error);
    return ()=> cleanup();
  }, [apiKey, onSelect]);

  return (
    <input
      ref={inputRef}
      defaultValue={value}
      placeholder={placeholder}
      className="w-full rounded-md border px-3 py-2 outline-none
                 border-neutral-300 focus:border-neutral-500 focus:ring-2 focus:ring-neutral-200"
    />
  );
}
