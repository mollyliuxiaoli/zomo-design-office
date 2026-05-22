const BASE_ALLOWED_HOSTS = [
  'zomo-design-office.vercel.app',
  'distill.style',
];

const LOCAL_HOSTNAMES = new Set(['localhost', '127.0.0.1', '::1']);

function safeUrlHost(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return null;

  try {
    const candidate = /^[a-z][a-z\d+.-]*:\/\//i.test(trimmed)
      ? trimmed
      : `http://${trimmed}`;
    return new URL(candidate).host.toLowerCase();
  } catch {
    return null;
  }
}

function hostnameFromHost(host: string): string | null {
  const safeHost = safeUrlHost(host);
  if (!safeHost) return null;

  try {
    return new URL(`http://${safeHost}`).hostname.toLowerCase().replace(/^\[|\]$/g, '');
  } catch {
    return null;
  }
}

function configuredHosts(): string[] {
  const rawHosts = [
    ...BASE_ALLOWED_HOSTS,
    process.env.VERCEL_URL,
    process.env.NEXT_PUBLIC_APP_URL,
    process.env.ALLOWED_APP_HOSTS,
  ]
    .filter(Boolean)
    .flatMap((value) => String(value).split(','))
    .map((value) => value.trim())
    .filter(Boolean);

  return rawHosts
    .map((value) => hostnameFromHost(value))
    .filter((value): value is string => Boolean(value));
}

export function isLocalDevHost(host: string): boolean {
  const hostname = hostnameFromHost(host);
  return Boolean(hostname && LOCAL_HOSTNAMES.has(hostname));
}

export function isAllowedProductionHost(host: string): boolean {
  const hostname = hostnameFromHost(host);
  if (!hostname) return false;

  if (/^zomo-design-office(?:-[a-z0-9-]+)?\.vercel\.app$/.test(hostname)) {
    return true;
  }

  return configuredHosts().some((allowedHost) => (
    hostname === allowedHost || hostname.endsWith(`.${allowedHost}`)
  ));
}

export function refererToHost(referer: string): string | null {
  if (!referer.trim()) return null;
  try {
    return new URL(referer).host.toLowerCase();
  } catch {
    return null;
  }
}

export function isValidTokenOrigin(referer: string, host: string): boolean {
  const requestHost = safeUrlHost(host);
  if (!requestHost) return false;

  const refererHost = referer.trim() ? refererToHost(referer) : requestHost;
  if (!refererHost) return false;

  if (isLocalDevHost(requestHost) && isLocalDevHost(refererHost)) {
    return true;
  }

  if (!isAllowedProductionHost(requestHost)) {
    return false;
  }

  return requestHost === refererHost || isAllowedProductionHost(refererHost);
}
