const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3333/api/v1";

async function handleResponse<T>(response: Response): Promise<T> {
  if (response.ok) {
    const text = await response.text();
    if (!text) {
      return {} as T;
    }
    return JSON.parse(text) as T;
  }

  let message = `Request failed with status ${response.status}`;
  try {
    const data = (await response.json()) as { message?: string };
    if (data?.message) {
      message = data.message;
    }
  } catch (err) {
    // ignore parse error
  }

  throw new Error(message);
}

export interface TokensResponse {
  accessToken: string;
  refreshToken: string;
}

export interface LoginPayload {
  accountSlug: string;
  email: string;
  password: string;
}

export interface RegisterPayload {
  accountName: string;
  email: string;
  password: string;
  locale?: "pt-BR" | "en";
}

export interface LoginResponse {
  tokens: TokensResponse;
  user: {
    id: string;
    email: string;
    role: string;
    locale?: string;
  };
  account: {
    id: string;
    name: string;
    slug: string;
    locale: string;
  };
  plan: {
    slug: string;
    name: string;
    proposalsPerMonth: number;
    isUnlimited: boolean;
  } | null;
  message?: string;
}

export interface RegisterResponse {
  account: {
    id: string;
    name: string;
    slug: string;
    locale: string;
  };
  user: {
    id: string;
    email: string;
    role: string;
    locale?: string;
  };
  tokens: TokensResponse;
}

export async function login(payload: LoginPayload): Promise<LoginResponse> {
  const response = await fetch(`${API_BASE_URL}/auth/login`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  return handleResponse<LoginResponse>(response);
}

export async function register(payload: RegisterPayload): Promise<RegisterResponse> {
  const response = await fetch(`${API_BASE_URL}/auth/register`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      locale: "pt-BR",
      ...payload,
    }),
  });

  return handleResponse<RegisterResponse>(response);
}

export async function refresh(refreshToken: string): Promise<{ tokens: TokensResponse }> {
  const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ refreshToken }),
  });

  return handleResponse<{ tokens: TokensResponse }>(response);
}

export interface ProfileResponse {
  user: {
    id: string;
    email: string;
    name: string;
    role: string;
    locale?: string | null;
    department?: {
      id: string;
      name: string;
    } | null;
  };
  account: {
    id: string;
    name: string;
    slug: string;
    locale: string;
  };
}

export async function me(accessToken: string): Promise<ProfileResponse> {
  const response = await fetch(`${API_BASE_URL}/auth/me`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  return handleResponse<ProfileResponse>(response);
}

export interface InvitePreviewResponse {
  data: {
    email: string;
    fullName?: string | null;
    account: {
      id: string;
      name: string;
      slug: string;
    };
  };
}

export function getInvitePreview(token: string): Promise<InvitePreviewResponse> {
  const url = new URL(`${API_BASE_URL}/team/invite/preview`);
  url.searchParams.set("token", token);

  return fetch(url.toString()).then((response) => handleResponse<InvitePreviewResponse>(response));
}

export interface AcceptInvitePayload {
  token: string;
  fullName?: string;
  password: string;
}

export interface AcceptInviteResponse {
  data: {
    email: string;
    account: {
      id: string;
      name: string;
      slug: string;
    };
  };
}

export async function acceptInvite(payload: AcceptInvitePayload): Promise<AcceptInviteResponse> {
  const response = await fetch(`${API_BASE_URL}/team/invite/accept`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  return handleResponse<AcceptInviteResponse>(response);
}
