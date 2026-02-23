import React, { useEffect, useRef } from "react";

export default function AddressAutoComplete({ addressData, onChange, onResolved }) {
  const inputRef = useRef(null);
  const autocompleteRef = useRef(null);

  useEffect(() => {
    if (window.google && window.google.maps && window.google.maps.places) {
      autocompleteRef.current = new window.google.maps.places.Autocomplete(inputRef.current, {
        componentRestrictions: { country: "us" },
        fields: ["address_components", "formatted_address"],
      });

      autocompleteRef.current.addListener("place_changed", () => {
        const place = autocompleteRef.current.getPlace();
        if (!place || !place.address_components) return;

        let streetNumber = "";
        let route = "";
        let city = "";
        let state = "";
        let zip = "";

        place.address_components.forEach((comp) => {
          const type = comp.types[0];
          if (type === "street_number") streetNumber = comp.longName;
          if (type === "route") route = comp.longName;
          if (type === "locality") city = comp.longName;
          if (type === "administrative_area_level_1") state = comp.shortName;
          if (type === "postal_code") zip = comp.longName;
        });

        const street1 = streetNumber ? `${streetNumber} ${route}` : route || place.formatted_address;

        const updated = {
          street1: street1 || "",
          street2: "", // Reset apt on new search
          city: city || "",
          state: state || "",
          zip: zip || "",
        };

        // Pass the updated object directly to both functions
        onChange(updated);
        onResolved(updated); 
      });
    }
  }, []);

  const inputBase = "w-full rounded border border-neutral-300 px-4 py-3 bg-white outline-none focus:border-brown focus:ring-1 focus:ring-brown transition-all";

  return (
    <div className="grid grid-cols-1 md:grid-cols-12 gap-4 text-left">
      <div className="md:col-span-8">
        <label className="text-xs font-bold text-neutral-500 mb-1 block uppercase tracking-widest">Street Address</label>
        <input
          ref={inputRef}
          type="text"
          className={inputBase}
          placeholder="Search for address..."
          value={addressData.street1 || ""}
          onChange={(e) => onChange({ ...addressData, street1: e.target.value })}
        />
      </div>

      <div className="md:col-span-4">
        <label className="text-xs font-bold text-neutral-500 mb-1 block uppercase tracking-widest">Apt/Suite</label>
        <input
          type="text"
          className={inputBase}
          value={addressData.street2 || ""}
          onChange={(e) => onChange({ ...addressData, street2: e.target.value })}
        />
      </div>

      <div className="md:col-span-5">
        <label className="text-xs font-bold text-neutral-400 mb-1 block uppercase">City</label>
        <input type="text" className={inputBase} value={addressData.city || ""} onChange={(e) => onChange({...addressData, city: e.target.value})} />
      </div>

      <div className="md:col-span-3">
        <label className="text-xs font-bold text-neutral-400 mb-1 block uppercase">State</label>
        <input type="text" className={inputBase} value={addressData.state || ""} onChange={(e) => onChange({...addressData, state: e.target.value})} />
      </div>

      <div className="md:col-span-4">
        <label className="text-xs font-bold text-neutral-400 mb-1 block uppercase">Zip Code</label>
        <input type="text" className={inputBase} value={addressData.zip || ""} onChange={(e) => onChange({...addressData, zip: e.target.value})} />
      </div>
    </div>
  );
}