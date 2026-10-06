import type { ApiResponse } from '@/types/shared';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api/v1';

interface RequestOptions {
	method?: 'GET' | 'POST' | 'PATCH' | 'DELETE';
	body?: unknown;
	token?: string;
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
	const res = await fetch(`${API_BASE_URL}${path}`, {
		method: options.method ?? 'GET',
		headers: {
			'Content-Type': 'application/json',
			...(options.token ? { Authorization: `Bearer ${options.token}` } : {})
		},
		body: options.body ? JSON.stringify(options.body) : undefined
	});

	const json: ApiResponse<T> = await res.json();

	if (!res.ok || !json.success) {
		throw new ApiError(json.message || 'Request failed', res.status, json.errors ?? []);
	}

	return json.data as T;
}
