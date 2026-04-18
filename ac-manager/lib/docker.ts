import Docker from 'dockerode';

const docker = new Docker({ socketPath: '/var/run/docker.sock' });

/**
 * Finds the AC Server container using a stable label.
 * This is more reliable than matching by container name, especially in
 * environments like Coolify where names can be dynamic.
 */
export async function getAcContainer() {
  const containers = await docker.listContainers({
    all: true,
    filters: {
      label: ['app.assetto-corsa.service=ac-server']
    }
  });

  if (containers.length === 0) {
    throw new Error('Container not found (searched by label: app.assetto-corsa.service=ac-server)');
  }

  return docker.getContainer(containers[0].Id);
}

export async function getContainerStatus() {
  try {
    const container = await getAcContainer();
    const data = await container.inspect();
    return data.State;
  } catch (error) {
    console.log('Error getting container status:', error);
    return { Status: 'not_found' };
  }
}

export async function getContainerLogStream() {
  const container = await getAcContainer();
  const info = await container.inspect();

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