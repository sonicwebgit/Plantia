import { query } from './_lib/db';
import { validateSession, getSessionFromCookie, AuthError } from './auth/utils';
import type { Category } from '../types';
import { v4 as uuidv4 } from 'uuid';

async function requireAuth(request: Request) {
  const cookieHeader = request.headers.get('cookie');
  const sessionId = getSessionFromCookie(cookieHeader || '');
  
  if (!sessionId) {
    throw new AuthError('Authentication required', 401);
  }
  
  const user = await validateSession(sessionId);
  if (!user) {
    throw new AuthError('Invalid session', 401);
  }
  
  return user;
}

export async function GET(request: Request): Promise<Response> {
  try {
    const user = await requireAuth(request);

    const { rows } = await query<Category>(
      'SELECT * FROM categories WHERE user_id = $1 ORDER BY created_at DESC',
      [user.id]
    );

    return new Response(JSON.stringify({
      success: true,
      categories: rows
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Get categories error:', error);
    
    if (error instanceof AuthError) {
      return new Response(JSON.stringify({
        success: false,
        error: error.message
      }), {
        status: error.status,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    return new Response(JSON.stringify({
      success: false,
      error: 'Internal server error'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

export async function POST(request: Request): Promise<Response> {
  try {
    const user = await requireAuth(request);
    const { name } = await request.json();

    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      throw new AuthError('Category name is required', 400);
    }

    const categoryId = uuidv4();
    
    const { rows } = await query<Category>(
      'INSERT INTO categories (id, user_id, name) VALUES ($1, $2, $3) RETURNING *',
      [categoryId, user.id, name.trim()]
    );

    return new Response(JSON.stringify({
      success: true,
      category: rows[0]
    }), {
      status: 201,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Create category error:', error);
    
    if (error instanceof AuthError) {
      return new Response(JSON.stringify({
        success: false,
        error: error.message
      }), {
        status: error.status,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    return new Response(JSON.stringify({
      success: false,
      error: 'Internal server error'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

export async function DELETE(request: Request): Promise<Response> {
  try {
    const user = await requireAuth(request);
    const url = new URL(request.url);
    const categoryId = url.searchParams.get('id');
    
    if (!categoryId) {
      throw new AuthError('Category ID is required', 400);
    }

    // Verify the category belongs to the user
    const { rows } = await query(
      'SELECT id FROM categories WHERE id = $1 AND user_id = $2',
      [categoryId, user.id]
    );

    if (rows.length === 0) {
      throw new AuthError('Category not found', 404);
    }

    // Delete category (this will set category_id to null for associated plants)
    await query('DELETE FROM categories WHERE id = $1 AND user_id = $2', [categoryId, user.id]);

    return new Response(JSON.stringify({
      success: true,
      message: 'Category deleted successfully'
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Delete category error:', error);
    
    if (error instanceof AuthError) {
      return new Response(JSON.stringify({
        success: false,
        error: error.message
      }), {
        status: error.status,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    return new Response(JSON.stringify({
      success: false,
      error: 'Internal server error'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}