import React, { useEffect, useRef } from "react";

export default function AddressAutoComplete({ addressData, onChange, onResolved }) {
  const containerRef = useRef(null);

  useEffect(() => {
    async function initAutocomplete() {
      // 1. Import the 'places' library using the new loader pattern
      const { PlaceAutocompleteElement } = await window.google.maps.importLibrary("places");

      // 2. Create the new element
      const autocompleteElement = new PlaceAutocompleteElement({
        componentRestrictions: { country: "us" }, // Optional
      });

      // 3. Append it to your container
      if (containerRef.current) {
        containerRef.current.innerHTML = ""; // Clear existing
        containerRef.current.appendChild(autocompleteElement);
      }

      // 4. Listen for the NEW selection event
      autocompleteElement.addEventListener("gmp-placeselect", async (event) => {
        const place = event.place; // This is a 'Place' object (New)

        if (!place) return;

        // 5. Fetch specific fields (New API requirement to control costs)
        await place.fetchFields({
          fields: ["addressComponents", "formattedAddress"],
        });

        let street = "", city = "", state = "", zip = "";

        place.addressComponents.forEach((comp) => {
          const type = comp.types[0];
          if (type === "street_number") street = comp.longName + " " + street;
          if (type === "route") street += comp.longName;
          if (type === "locality") city = comp.longName;
          if (type === "administrative_area_level_1") state = comp.shortName;
          if (type === "postal_code") zip = comp.longName;
        });

        onChange({
          ...addressData,
          street1: street || place.formattedAddress,
          city,
          state,
          zip,
        });
        onResolved(true);
      });
    }

    if (window.google) initAutocomplete();
  }, []);

  return (
    <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
      <div className="md:col-span-8">
        <label className="text-xs font-bold text-neutral-500 mb-1 block uppercase tracking-tighter">
          Street Address
        </label>
        {/* The new Google element will render inside this div */}
        <div ref={containerRef} className="autocomplete-container"></div>
      </div>
      {/* Rest of your manual inputs... */}
    </div>
  );
}
