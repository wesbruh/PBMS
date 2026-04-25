export async function fetchProfileForSession(session) {
  const response = await fetch(`${import.meta.env.VITE_API_URL}/api/profile/${session?.user?.id}`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${session?.access_token}`,
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) return undefined;

  const data = await response.json();
  if (!data) return null;

  const { role_name, ...rest } = data;
  return { ...rest, roleName: role_name };
}
