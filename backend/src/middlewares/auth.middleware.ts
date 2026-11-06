import type { NextFunction, Request, Response } from 'express';
import { getSupabasePublicClient } from '../config/supabase.js';
import { ApiError } from '../utils/apiResponse.js';

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email?: string;
    role: 'user' | 'admin';
  };
}

/**
 * Server-side Admin RBAC Middleware.
 * Admin authorization is never enforced solely by hiding UI buttons;
 * every admin route verifies the Supabase JWT and checks `app_metadata.role === 'admin'`.
 */
export async function requireAdmin(
  req: AuthenticatedRequest,
  _res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new ApiError(401, 'UNAUTHORIZED', 'Authorization Bearer token is required.');
    }

    const token = authHeader.slice('Bearer '.length).trim();
    if (!token) {
      throw new ApiError(401, 'UNAUTHORIZED', 'Empty authorization token.');
    }

    const supabase = getSupabasePublicClient();
    if (!supabase) {
      throw new ApiError(
        503,
        'SUPABASE_NOT_CONFIGURED',
        'Supabase connection is not configured yet for admin verification.',
      );
    }

    const { data, error } = await supabase.auth.getUser(token);
    if (error || !data.user) {
      throw new ApiError(401, 'UNAUTHORIZED', 'Invalid or expired authentication token.');
    }

    const appRole = (data.user.app_metadata as Record<string, unknown> | undefined)?.role;
    if (appRole !== 'admin') {
      throw new ApiError(403, 'FORBIDDEN', 'Admin privileges are required to perform this action.');
    }

    req.user = {
      id: data.user.id,
      email: data.user.email,
      role: 'admin',
    };

    next();
  } catch (err) {
    next(err);
  }
}
