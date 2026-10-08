import type { ApiResponse } from '@/types/shared';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api/v1';

// Fired when an authenticated request comes back 401 (expired or revoked
// session). AuthProvider listens and signs the user out.
export const SESSION_EXPIRED_EVENT = 'phishguard:session-expired';

interface RequestOptions {
	method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
	body?: unknown;
	token?: string;
	// Send body as-is with this content type instead of as JSON (e.g. a CSV upload)
	contentType?: string;
}

// Carries the server's per-field validation errors so forms can show them
// next to the right input. Still an Error, so existing callers that only
// read .message keep working.
export class ApiError extends Error {
	constructor(
		message: string,
		public readonly status: number,
		public readonly fieldErrors: { field?: string; message: string }[] = []
	) {
		super(message);
		this.name = 'ApiError';
	}
}

export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
	const raw = !!options.contentType;
	const res = await fetch(`${API_BASE_URL}${path}`, {
		method: options.method ?? 'GET',
		headers: {
			'Content-Type': options.contentType ?? 'application/json',
			...(options.token ? { Authorization: `Bearer ${options.token}` } : {})
		},
		body: options.body === undefined ? undefined : raw ? String(options.body) : JSON.stringify(options.body)
	});

	const json: ApiResponse<T> = await res.json();

	if (res.status === 401 && options.token && typeof window !== 'undefined') {
		window.dispatchEvent(new Event(SESSION_EXPIRED_EVENT));
	}

	if (!res.ok || !json.success) {
		throw new ApiError(json.message || 'Request failed', res.status, json.errors ?? []);
	}

	return json.data as T;
}
