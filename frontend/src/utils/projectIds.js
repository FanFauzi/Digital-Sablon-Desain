export function getCloudProjectId(projectId) {
  if (typeof projectId !== 'string' || !projectId.startsWith('cloud:')) {
    return null
  }

  const serverId = projectId.slice('cloud:'.length)
  return /^[1-9]\d*$/.test(serverId) ? serverId : null
}
