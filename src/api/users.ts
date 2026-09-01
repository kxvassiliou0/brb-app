import { get, patch, post, remove } from '@/api/client'
import type {
  CreateUserBody,
  UpdateUserBody,
  UserListItem,
  UserProfile,
  UserRecord,
} from '@/types/api'

const USERS_PATH = '/api/users'

function userPath(id: number): string {
  return `${USERS_PATH}/${id}`
}

export function listUsers(): Promise<UserListItem[]> {
  return get<UserListItem[]>(USERS_PATH)
}

export function listUserProfiles(): Promise<UserProfile[]> {
  return get<UserProfile[]>(USERS_PATH)
}

export function getMyProfile(): Promise<UserProfile> {
  return get<UserProfile>(`${USERS_PATH}/me`)
}

export function getUser(id: number): Promise<UserRecord> {
  return get<UserRecord>(userPath(id))
}

export function createUser(body: CreateUserBody): Promise<void> {
  return post(USERS_PATH, body)
}

export function updateUser(id: number, body: UpdateUserBody): Promise<void> {
  return patch(userPath(id), body)
}

export function deleteUser(id: number): Promise<void> {
  return remove(userPath(id))
}
