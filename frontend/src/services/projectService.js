import api from './api'
import {
  deleteLocalProject,
  getSavedProjects,
} from './projectStorage'

function normalizeCloudProject(project) {
  const config = project.canvas_config || {}

  return {
    id: `cloud:${project.id}`,
    storageType: 'cloud',
    serverId: project.id,
    name: project.name,
    shirtId: String(config.shirt_id ?? ''),
    shirtName: config.shirt_name || 'Produk',
    selectedColor: config.selected_color || '#ffffff',
    selectedSize: config.selected_size || 'M',
    selectedSide: config.selected_side || 'front',
    updatedAt: project.updated_at,
    canvasState: null,
  }
}

function normalizeLocalProject(project) {
  return {
    ...project,
    id: `local:${project.id}`,
    storageType: 'local',
    localId: project.id,
  }
}

export async function getEditorProjects(shirtId) {
  const [localResult, cloudResult] = await Promise.allSettled([
    getSavedProjects(shirtId),
    api.get('/projects'),
  ])

  if (cloudResult.status === 'rejected') {
    throw cloudResult.reason
  }

  const localProjects = localResult.status === 'fulfilled'
    ? localResult.value.map(normalizeLocalProject)
    : []

  const cloudProjects = (cloudResult.value.data.data || [])
    .filter((project) => String(project.canvas_config?.shirt_id) === String(shirtId))
    .map(normalizeCloudProject)

  return [...cloudProjects, ...localProjects].sort((first, second) =>
    new Date(second.updatedAt).getTime() - new Date(first.updatedAt).getTime()
  )
}

export async function saveEditorProject(activeProjectId, payload) {
  let response

  if (activeProjectId?.startsWith('cloud:')) {
    const projectId = activeProjectId.slice('cloud:'.length)
    response = await api.put(`/projects/${projectId}`, payload)
  } else {
    response = await api.post('/projects', payload)

    // Proyek lokal lama baru dihapus setelah salinan server berhasil dibuat.
    if (activeProjectId?.startsWith('local:')) {
      const localId = activeProjectId.slice('local:'.length)
      await deleteLocalProject(localId).catch((error) => {
        console.warn('Proyek lokal masih tersimpan sebagai cadangan.', error)
      })
    }
  }

  return normalizeCloudProject(response.data.data)
}

export async function loadEditorProject(project) {
  if (project.storageType === 'local') {
    const { id: displayId, ...localProject } = project
    return { ...localProject, id: displayId, canvasState: project.canvasState }
  }

  const response = await api.get(`/projects/${project.serverId}`)
  const record = response.data.data
  const normalized = normalizeCloudProject(record)

  return {
    ...normalized,
    canvasState: record.editor_state,
  }
}

export async function deleteEditorProject(project) {
  if (project.storageType === 'local') {
    return deleteLocalProject(project.localId)
  }

  await api.delete(`/projects/${project.serverId}`)
}
