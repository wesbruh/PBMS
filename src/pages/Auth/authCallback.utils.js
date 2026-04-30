export async function markUserActive(session) {
  if (!session || !session?.user?.id) return;
  const userId = session.user.id;

  const updates = {
    is_active: true,
    last_login_at: new Date().toISOString(),
  };

  const response = await fetch(`${import.meta.env.VITE_API_URL}/api/profile/${userId}`, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${session?.access_token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(updates),
  });

  if (!response.ok) {
    const { errorData } = await response.json();
    console.error("Failed updating user activity:", errorData.error);
  }
}
