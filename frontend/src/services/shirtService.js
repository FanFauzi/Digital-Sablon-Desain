import api from './api'

export const getShirts = async () => {
  const response = await api.get('/shirts')

  // Mendukung respons Laravel Resource maupun array biasa.
  const result = response.data
  return Array.isArray(result) ? result : result.data ?? []
}