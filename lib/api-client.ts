type JsonBody =
  | BodyInit
  | Record<string, unknown>
  | undefined;

interface RequestOptions extends Omit<RequestInit, 'body'> {
  body?: JsonBody;
  params?: Record<string, string | number | undefined>;
}

function buildUrl(url: string, params?: RequestOptions['params']): string {
  if (!params) {
    return url;
  }

  const searchParams = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      searchParams.set(key, String(value));
    }
  });

  const query = searchParams.toString();
  return query ? `${url}?${query}` : url;
}

export async function requestJson<T>(
  url: string,
  { params, headers, body, ...options }: RequestOptions = {}
): Promise<T> {
  let requestBody: BodyInit | undefined;

  if (body === undefined) {
    requestBody = undefined;
  } else if (
    typeof body === 'string' ||
    body instanceof Blob ||
    body instanceof FormData ||
    body instanceof URLSearchParams ||
    body instanceof ArrayBuffer
  ) {
    requestBody = body;
  } else {
    requestBody = JSON.stringify(body);
  }

  const response = await fetch(buildUrl(url, params), {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
    body: requestBody,
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const errorMessage =
      typeof data?.error === 'string' ? data.error : 'Request failed';
    throw new Error(errorMessage);
  }

  return data as T;
}

export function getJson<T>(url: string, params?: RequestOptions['params']) {
  return requestJson<T>(url, { method: 'GET', params });
}

export function postJson<T>(
  url: string,
  body?: JsonBody
) {
  return requestJson<T>(url, { method: 'POST', body });
}

export function patchJson<T>(
	  url: string,
	  body?: JsonBody
	) {
	  return requestJson<T>(url, { method: 'PATCH', body });
}

export function deleteJson<T>(
	  url: string,
	  body?: JsonBody
	) {
	  return requestJson<T>(url, { method: 'DELETE', body });
}
