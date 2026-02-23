import React, { useEffect, useRef } from "react";

export default function AddressAutoComplete({ addressData, onChange, onResolved }) {
  const street1Ref = useRef(null);

  useEffect(() => {
    // Graceful degradation: If Google isn't loaded, just skip autocomplete initialization
    if (!window.google || !window.google.maps || !street1Ref.current) {
      console.warn("Google Maps Script not found. Manual entry mode active.");
      return;
    }

    const autocomplete = new window.google.maps.places.Autocomplete(street1Ref.current, {
      fields: ["address_components", "geometry", "formatted_address"],
      types: ["address"],
    });

    autocomplete.addListener("place_changed", () => {
      const place = autocomplete.getPlace();
      if (!place.address_components) return;

      let street = "", city = "", state = "", zip = "";

      place.address_components.forEach((comp) => {
        const type = comp.types[0];
        if (type === "street_number") street = comp.long_name + " " + street;
        if (type === "route") street += comp.long_name;
        if (type === "locality") city = comp.long_name;
        if (type === "administrative_area_level_1") state = comp.short_name;
        if (type === "postal_code") zip = comp.long_name;
      });

      onChange({
        ...addressData,
        street1: street || place.formatted_address,
        city,
        state,
        zip,
      });
      onResolved(true);
    });
  }, [onChange, onResolved, addressData]);

  const inputClass = "w-full rounded-lg border border-neutral-300 px-4 py-3 outline-none focus:ring-2 focus:ring-brown/20 focus:border-brown transition-all";

  return (
    <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
      <div className="md:col-span-8">
        <label className="text-xs font-bold text-neutral-500 mb-1 block uppercase tracking-tighter">Street Address</label>
        <input
          ref={street1Ref}
          type="text"
          placeholder="Start typing your address..."
          className={inputClass}
          value={addressData.street1}
          onChange={(e) => onChange({ ...addressData, street1: e.target.value })}
        />
      </div>
      <div className="md:col-span-4">
        <label className="text-xs font-bold text-neutral-500 mb-1 block uppercase tracking-tighter">Apt/Suite</label>
        <input
          type="text"
          placeholder="Apt 4B"
          className={inputClass}
          value={addressData.street2}
          onChange={(e) => onChange({ ...addressData, street2: e.target.value })}
        />
      </div>
      <div className="md:col-span-5">
        <label className="text-xs font-bold text-neutral-500 mb-1 block uppercase tracking-tighter">City</label>
        <input
          type="text"
          placeholder="City"
          className={inputClass}
          value={addressData.city}
          onChange={(e) => onChange({ ...addressData, city: e.target.value })}
        />
      </div>
      <div className="md:col-span-3">
        <label className="text-xs font-bold text-neutral-500 mb-1 block uppercase tracking-tighter">State</label>
        <input
          type="text"
          placeholder="CA"
          className={inputClass}
          value={addressData.state}
          onChange={(e) => onChange({ ...addressData, state: e.target.value })}
        />
      </div>
      <div className="md:col-span-4">
        <label className="text-xs font-bold text-neutral-500 mb-1 block uppercase tracking-tighter">Zip Code</label>
        <input
          type="text"
          placeholder="90210"
          className={inputClass}
          value={addressData.zip}
          onChange={(e) => onChange({ ...addressData, zip: e.target.value })}
        />
      </div>
    </div>
  );
}