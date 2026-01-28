const BLOB_SERVICE_URL = process.env.BLOB_SERVICE_URL || "http://blob-service:8080";
const REPORTS_SERVICE_URL = process.env.REPORTS_SERVICE_URL || "http://reports-service:8080";
const DATA_SERVICE_URL = process.env.DATA_SERVICE_URL || "http://data-service:8080";

type ServiceName = "blob" | "reports" | "data";

function getBaseUrl(service: ServiceName): string {
  switch (service) {
    case "blob":
      return BLOB_SERVICE_URL;
    case "reports":
      return REPORTS_SERVICE_URL;
    case "data":
      return DATA_SERVICE_URL;
  }
}

export async function apiGet<T>(service: ServiceName, path: string): Promise<T> {
  const url = `${getBaseUrl(service)}${path}`;
  const response = await fetch(url, {
    method: "GET",
    headers: { "Content-Type": "application/json" },
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`API error: ${response.status} ${response.statusText}`);
  }

  return response.json();
}

export async function apiPost<T>(
  service: ServiceName,
  path: string,
  body?: unknown
): Promise<T> {
  const url = `${getBaseUrl(service)}${path}`;
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!response.ok) {
    throw new Error(`API error: ${response.status} ${response.statusText}`);
  }

  return response.json();
}

export async function apiPut<T>(
  service: ServiceName,
  path: string,
  body: unknown
): Promise<T> {
  const url = `${getBaseUrl(service)}${path}`;
  const response = await fetch(url, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    throw new Error(`API error: ${response.status} ${response.statusText}`);
  }

  return response.json();
}

export async function apiDelete(service: ServiceName, path: string): Promise<void> {
  const url = `${getBaseUrl(service)}${path}`;
  const response = await fetch(url, {
    method: "DELETE",
  });

  if (!response.ok) {
    throw new Error(`API error: ${response.status} ${response.statusText}`);
  }
}

export async function apiPostFormData<T>(
  service: ServiceName,
  path: string,
  formData: FormData
): Promise<T> {
  const url = `${getBaseUrl(service)}${path}`;
  const response = await fetch(url, {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    throw new Error(`API error: ${response.status} ${response.statusText}`);
  }

  return response.json();
}
