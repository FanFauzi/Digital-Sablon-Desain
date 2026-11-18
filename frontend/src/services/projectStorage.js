const DATABASE_NAME = 'digital-sablon-studio'
const DATABASE_VERSION = 1
const PROJECT_STORE = 'saved-projects'

let databasePromise

function openDatabase() {
  if (typeof indexedDB === 'undefined') {
    return Promise.reject(new Error('Browser ini tidak mendukung penyimpanan proyek lokal.'))
  }

  if (!databasePromise) {
    databasePromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(DATABASE_NAME, DATABASE_VERSION)

      request.onupgradeneeded = () => {
        const database = request.result

        if (!database.objectStoreNames.contains(PROJECT_STORE)) {
          database.createObjectStore(PROJECT_STORE, { keyPath: 'id' })
        }
      }

      request.onsuccess = () => resolve(request.result)
      request.onerror = () => {
        databasePromise = null
        reject(request.error || new Error('Gagal membuka penyimpanan proyek.'))
      }

      request.onblocked = () => {
        databasePromise = null
        reject(new Error('Tutup tab aplikasi lain untuk memperbarui penyimpanan proyek.'))
      }
    })
  }

  return databasePromise
}

export async function getSavedProjects(shirtId) {
  const database = await openDatabase()

  return new Promise((resolve, reject) => {
    const transaction = database.transaction(PROJECT_STORE, 'readonly')
    const request = transaction.objectStore(PROJECT_STORE).getAll()

    request.onsuccess = () => {
      const projects = request.result || []
      resolve(
        projects
          .filter((project) => String(project.shirtId) === String(shirtId))
          .sort((first, second) =>
            new Date(second.updatedAt).getTime() - new Date(first.updatedAt).getTime()
          )
      )
    }

    request.onerror = () => reject(request.error || new Error('Gagal membaca proyek tersimpan.'))
  })
}

export async function saveLocalProject(project) {
  const database = await openDatabase()
  const record = {
    ...project,
    id: project.id || crypto.randomUUID(),
    shirtId: String(project.shirtId),
    updatedAt: new Date().toISOString(),
  }

  return new Promise((resolve, reject) => {
    const transaction = database.transaction(PROJECT_STORE, 'readwrite')
    transaction.objectStore(PROJECT_STORE).put(record)

    transaction.oncomplete = () => resolve(record)
    transaction.onerror = () => reject(transaction.error || new Error('Gagal menyimpan proyek.'))
    transaction.onabort = () => reject(transaction.error || new Error('Penyimpanan proyek dibatalkan.'))
  })
}

export async function deleteLocalProject(projectId) {
  const database = await openDatabase()

  return new Promise((resolve, reject) => {
    const transaction = database.transaction(PROJECT_STORE, 'readwrite')
    transaction.objectStore(PROJECT_STORE).delete(projectId)

    transaction.oncomplete = () => resolve()
    transaction.onerror = () => reject(transaction.error || new Error('Gagal menghapus proyek.'))
    transaction.onabort = () => reject(transaction.error || new Error('Penghapusan proyek dibatalkan.'))
  })
}
