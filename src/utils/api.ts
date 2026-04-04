export const safeFetchJson = async <T = any>(url: string, options?: RequestInit, silent = false): Promise<T> => {
  try {
    const res = await fetch(url, {
      ...options,
      credentials: options?.credentials || 'include'
    });
    if (!res.ok) {
      const text = await res.text();
      const errorMsg = `HTTP error! status: ${res.status}, body: ${text.substring(0, 100)}`;
      if (!silent) console.error(`Failed to fetch from ${url}:`, errorMsg);
      throw new Error(errorMsg);
    }
    const contentType = res.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      const text = await res.text();
      const errorMsg = `Expected JSON but got: ${text.substring(0, 100)}`;
      if (!silent) console.error(`Failed to fetch from ${url}:`, errorMsg);
      throw new Error(errorMsg);
    }
    return await res.json() as T;
  } catch (e) {
    if (!silent) console.error(`Failed to fetch from ${url}:`, e);
    throw e;
  }
};
