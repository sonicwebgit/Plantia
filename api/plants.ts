import { authDb, query } from './_lib/db';
import { validateSession, getSessionFromCookie, AuthError } from './auth/utils';
import type { Plant, PlantIdentificationResult } from '../types';
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

    const { rows } = await query<Plant>(
      'SELECT * FROM plants WHERE user_id = $1 ORDER BY created_at DESC',
      [user.id]
    );

    return new Response(JSON.stringify({
      success: true,
      plants: rows
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Get plants error:', error);
    
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
    const body = await request.json();
    
    const {
      identification,
      nickname,
      location,
      categoryId,
      notes
    }: {
      identification: PlantIdentificationResult;
      nickname?: string;
      location?: string;
      categoryId?: string;
      notes?: string;
    } = body;

    if (!identification) {
      throw new AuthError('Plant identification data is required', 400);
    }

    const plantId = uuidv4();
    
    const { rows } = await query<Plant>(
      `INSERT INTO plants (id, user_id, species, common_name, confidence, nickname, location, category_id, notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
      [
        plantId,
        user.id,
        identification.species,
        identification.commonName,
        identification.confidence,
        nickname,
        location,
        categoryId,
        notes
      ]
    );

    const plant = rows[0];

    // Create care profile
    const careProfileId = uuidv4();
    await query(
      `INSERT INTO care_profiles (id, user_id, plant_id, species, sunlight, watering, soil, fertilizer, temp_range, humidity, tips)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
      [
        careProfileId,
        user.id,
        plantId,
        identification.species,
        identification.careProfile.sunlight,
        identification.careProfile.watering,
        identification.careProfile.soil,
        identification.careProfile.fertilizer,
        identification.careProfile.tempRange,
        identification.careProfile.humidity,
        identification.careProfile.tips
      ]
    );

    // Create default tasks
    const defaultTasks = [
      {
        id: uuidv4(),
        type: 'water',
        title: 'Water Plant',
        nextRunAt: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString()
      },
      {
        id: uuidv4(),
        type: 'fertilize',
        title: 'Fertilize',
        nextRunAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString()
      }
    ];

    for (const task of defaultTasks) {
      await query(
        `INSERT INTO tasks (id, user_id, plant_id, type, title, next_run_at)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [task.id, user.id, plantId, task.type, task.title, task.nextRunAt]
      );
    }

    return new Response(JSON.stringify({
      success: true,
      plant
    }), {
      status: 201,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Create plant error:', error);
    
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
    const plantId = url.searchParams.get('id');
    
    if (!plantId) {
      throw new AuthError('Plant ID is required', 400);
    }

    // Verify the plant belongs to the user
    const { rows } = await query(
      'SELECT id FROM plants WHERE id = $1 AND user_id = $2',
      [plantId, user.id]
    );

    if (rows.length === 0) {
      throw new AuthError('Plant not found', 404);
    }

    // Delete plant (cascading deletes will handle related data)
    await query('DELETE FROM plants WHERE id = $1 AND user_id = $2', [plantId, user.id]);

    return new Response(JSON.stringify({
      success: true,
      message: 'Plant deleted successfully'
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Delete plant error:', error);
    
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