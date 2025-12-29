import { CliResponse } from '../types/index.js';

export function success<T>(command: string, data: T): CliResponse<T> {
  return {
    success: true,
    command,
    data,
  };
}

export function error(command: string, code: string, message: string): CliResponse {
  return {
    success: false,
    command,
    error: { code, message },
  };
}

export function output(response: CliResponse): void {
  console.log(JSON.stringify(response, null, 2));
}

export function handleError(command: string, err: unknown): void {
  const message = err instanceof Error ? err.message : String(err);

  // Determine error code based on message patterns
  let code = 'UNKNOWN_ERROR';

  if (message.includes('LINEAR_API_KEY')) {
    code = 'AUTH_ERROR';
  } else if (message.includes('not found') || message.includes('Not found')) {
    code = 'NOT_FOUND';
  } else if (message.includes('rate limit') || message.includes('RATELIMITED')) {
    code = 'RATE_LIMITED';
  } else if (message.includes('validation') || message.includes('Invalid')) {
    code = 'VALIDATION_ERROR';
  } else if (message.includes('permission') || message.includes('unauthorized')) {
    code = 'PERMISSION_DENIED';
  }

  output(error(command, code, message));
  process.exit(1);
}
