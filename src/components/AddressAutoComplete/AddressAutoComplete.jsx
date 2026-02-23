import React, { useEffect, useRef, useState } from "react";

export default function AddressAutoComplete({ addressData, onChange, onResolved }) {
  const containerRef = useRef(null);
  const [apiActive, setApiActive] = useState(true);
  const initialized = useRef(false);

  const dataRef = useRef(addressData);
  useEffect(() => {
    dataRef.current = addressData;
  }, [addressData]);

  useEffect(() => {
    if (initialized.current) return;

    async function initAutocomplete() {
      if (!window.google || !window.google.maps) {
        setApiActive(false);
        return;
      }

      try {
        const { PlaceAutocompleteElement } = await window.google.maps.importLibrary("places");
        
        const autocompleteElement = new PlaceAutocompleteElement({
          componentRestrictions: { country: "us" },
        });

        autocompleteElement.style.width = "100%";

        if (containerRef.current) {
          containerRef.current.innerHTML = "";
          containerRef.current.appendChild(autocompleteElement);
          initialized.current = true;
        }

        autocompleteElement.addEventListener("gmp-input", (e) => {
          onChange({
            ...dataRef.current,
            street1: e.target.inputValue || ""
          });
        });

        autocompleteElement.addEventListener("gmp-placeselect", async (event) => {
          const place = event.place;
          if (!place) return;

          await place.fetchFields({
            fields: ["addressComponents", "formattedAddress"],
          });

          let streetNumber = "", route = "", city = "", state = "", zip = "";

          place.addressComponents.forEach((comp) => {
            const type = comp.types[0];
            if (type === "street_number") streetNumber = comp.longName;
            if (type === "route") route = comp.longName;
            if (type === "locality") city = comp.longName;
            if (type === "administrative_area_level_1") state = comp.shortName;
            if (type === "postal_code") zip = comp.longName;
          });

          const street1 = streetNumber ? `${streetNumber} ${route}` : route || place.formattedAddress;

          const updated = {
            ...dataRef.current,
            street1,
            city,
            state,
            zip,
          };

          onChange(updated);
          onResolved(updated);
          autocompleteElement.inputValue = street1; 
        });

      } catch (err) {
        console.error("New Places API load error:", err);
        setApiActive(false);
      }
    }

    initAutocomplete();
  }, [onChange, onResolved]);

  const inputBase = "w-full rounded border border-neutral-300 px-4 py-3 bg-white outline-none focus:border-brown focus:ring-1 focus:ring-brown transition-all";

  return (
    <div className="grid grid-cols-1 md:grid-cols-12 gap-4 text-left">
      <div className="md:col-span-8 text-left">
        <label className="text-xs font-bold text-neutral-500 mb-1 block uppercase tracking-widest">
          Street Address
        </label>
        {apiActive ? (
          <div 
            ref={containerRef} 
            className="w-full rounded border border-neutral-300 bg-white shadow-sm focus-within:border-brown focus-within:ring-1 focus-within:ring-brown min-h-[50px]"
          ></div>
        ) : (
          <input
            type="text"
            className={inputBase}
            placeholder="Enter street address"
            value={addressData.street1 || ""}
            onChange={(e) => onChange({ ...addressData, street1: e.target.value })}
          />
        )}
      </div>

      <div className="md:col-span-4 text-left">
        <label className="text-xs font-bold text-neutral-500 mb-1 block uppercase tracking-widest">Apt/Suite</label>
        <input
          type="text"
          className={inputBase}
          placeholder="Optional"
          value={addressData.street2 || ""}
          onChange={(e) => onChange({ ...addressData, street2: e.target.value })}
        />
      </div>

      <div className="md:col-span-5 text-left">
        <label className="text-xs font-bold text-neutral-400 mb-1 block uppercase">City</label>
        <input 
          type="text" 
          className={inputBase} 
          value={addressData.city || ""} 
          onChange={(e) => onChange({...addressData, city: e.target.value})} 
        />
      </div>

      <div className="md:col-span-3 text-left">
        <label className="text-xs font-bold text-neutral-400 mb-1 block uppercase">State</label>
        <input 
          type="text" 
          className={inputBase} 
          value={addressData.state || ""} 
          onChange={(e) => onChange({...addressData, state: e.target.value})} 
        />
      </div>

      <div className="md:col-span-4 text-left">
        <label className="text-xs font-bold text-neutral-400 mb-1 block uppercase">Zip Code</label>
        <input 
          type="text" 
          className={inputBase} 
          value={addressData.zip || ""} 
          onChange={(e) => onChange({...addressData, zip: e.target.value})} 
        />
      </div>
    </div>
  );
}