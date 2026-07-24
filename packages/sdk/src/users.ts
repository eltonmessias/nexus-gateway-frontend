import type { User, UserRequest, PagedResult, PageParams } from '@nexus/types'
import { NexusHttpClient } from './client'

export class UsersResource extends NexusHttpClient {
  list({ page = 0, size = 20 }: PageParams = {}) {
    return this.get<PagedResult<User>>(`/api/iam/users?page=${page}&size=${size}`)
  }

  findById(id: string) {
    return this.get<User>(`/api/iam/users/${id}`)
  }

  create(body: UserRequest) {
    return this.post<User>('/api/iam/users', body)
  }

  update(id: string, body: Partial<UserRequest>) {
    return this.put<User>(`/api/iam/users/${id}`, body)
  }

  delete(id: string) {
    return this.del<void>(`/api/iam/users/${id}`)
  }

  setActive(id: string, active: boolean) {
    return this.patch<User>(`/api/iam/users/${id}/active`, { active })
  }
}
