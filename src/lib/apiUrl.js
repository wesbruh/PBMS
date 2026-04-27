// able to be changed here so all files refernces the same variable.
// additionally, JEST does not like raw import.meta.env in fetch calls, has to be a variable.
export const API_URL = import.meta.env.VITE_API_URL;