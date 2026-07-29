import { createApiDataSource } from './client'
import { mockDataSource } from './mockData'

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'
const CORRIDOR_NAME = import.meta.env.VITE_CORRIDOR_NAME || 'Linden Blvd'

/**
 * Resolves to the live API when it answers /health, otherwise falls back to
 * sample data so the UI is always explorable. App.jsx surfaces which one is
 * active via `.label`.
 */
export async function resolveDataSource() {
  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 2500)
    const res = await fetch(`${API_BASE}/health`, { signal: controller.signal })
    clearTimeout(timeout)
    if (!res.ok) throw new Error('unhealthy')
    return createApiDataSource(CORRIDOR_NAME)
  } catch {
    return mockDataSource
  }
}
