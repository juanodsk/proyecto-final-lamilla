export async function api(path, { token, body, method = 'GET', signal } = {}) {
  const response = await fetch('/api' + path, {
    method, signal,
    headers: {
      ...(token && { Authorization: 'Bearer ' + token }),
      ...(body && { 'Content-Type': 'application/json' }),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(data.error ?? 'El servicio no está disponible. Intenta de nuevo.');
    error.status = response.status;
    throw error;
  }
  return data;
}
