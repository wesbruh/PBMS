// This file will handle distance calculations for Bailey White's commute
// Using the Google Distance Matrix API

export const calculateTravelTime = async (origin, destination) => {
  // We will call this from the backend or a serverless function 
  // to avoid exposing the full Distance Matrix logic on the client
  try {
    const apiKey = process.env.VITE_GOOGLE_MAPS_API_KEY; 
    const url = `https://maps.googleapis.com/maps/api/distancematrix/json?origins=${origin}&destinations=${destination}&key=${apiKey}`;
    
    // logic for fetching and parsing distance goes here
    return { travelTime: 30 }; // placeholder for 30 mins
  } catch (error) {
    console.error("Travel calculation failed", error);
    return null;
  }
};