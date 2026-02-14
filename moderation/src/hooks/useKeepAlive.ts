import { useEffect, useRef } from 'react'

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api'
const PING_INTERVAL = 30_000 // 30 secondes

/**
 * Envoie un ping léger au backend toutes les 30s
 * pour empêcher Render (free tier) de mettre le serveur en veille.
 */
export function useKeepAlive() {
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    const ping = () => {
      fetch(`${API_BASE_URL}/sante`, { method: 'GET' }).catch(() => {
        // silencieux — on ne veut pas polluer la console
      })
    }

    // Ping immédiat au montage
    ping()

    intervalRef.current = setInterval(ping, PING_INTERVAL)

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [])
}