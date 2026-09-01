import { postForToken } from '@/api/client'

export function login(email: string, password: string): Promise<string> {
  return postForToken('/api/login', { email, password })
}
