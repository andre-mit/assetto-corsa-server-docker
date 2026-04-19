import Docker from 'dockerode';

const docker = new Docker({ socketPath: '/var/run/docker.sock' });

interface CachedStatus {
  data: any;
  timestamp: number;
}

let statusCache: CachedStatus | null = null;
const CACHE_TTL = 10000; // 10 seconds
const DOCKER_TIMEOUT = 8000; // 8 seconds

/**
 * Helper to wrap a promise with a timeout
 */
function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(`Docker timeout: ${label} (limit ${ms}ms)`)), ms)
    )
  ]);
}

/**
 * Finds the AC Server container using a stable label.
 */
export async function getAcContainer() {
  const containers = await withTimeout(
    docker.listContainers({
      all: true,
      filters: {
        label: ['app.assetto-corsa.service=ac-server']
      }
    }),
    DOCKER_TIMEOUT,
    'listContainers'
  );

  if (containers.length === 0) {
    throw new Error('Container not found (searched by label: app.assetto-corsa.service=ac-server)');
  }

  return docker.getContainer(containers[0].Id);
}

export async function getContainerStatus() {
  const now = Date.now();
  
  // Return cached status if it's still fresh
  if (statusCache && (now - statusCache.timestamp < CACHE_TTL)) {
    return statusCache.data;
  }

  try {
    const container = await getAcContainer();
    const data = await withTimeout(
      container.inspect(),
      DOCKER_TIMEOUT,
      'inspect'
    );
    
    // Update cache
    statusCache = {
      data: data.State,
      timestamp: now
    };
    
    return data.State;
  } catch (error) {
    console.error('[lib/docker] Error getting container status:', error instanceof Error ? error.message : error);
    
    // If we have a cache, even if expired, return it as a fallback during errors/timeouts
    if (statusCache) {
      console.log('[lib/docker] Returning stale cache as fallback');
      return statusCache.data;
    }
    
    return { Status: 'unknown' };
  }
}

export async function getContainerLogStream() {
  const container = await getAcContainer();
  const info = await withTimeout(
    container.inspect(),
    DOCKER_TIMEOUT,
    'inspect_logs'
  );

  if (!info.State.Running) {
    throw new Error('Container is currently offline.');
  }

  return await container.logs({
    follow: true,
    stdout: true,
    stderr: true,
    tail: 50,
  });
}

export default docker;