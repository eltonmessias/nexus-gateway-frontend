import type { SearchRequest, SearchResponse, SearchDocumentRequest } from '@nexus/types'
import { NexusHttpClient } from './client'

export class SearchResource extends NexusHttpClient {
  query(body: SearchRequest) {
    return this.post<SearchResponse>('/api/search/query', body)
  }

  index(body: SearchDocumentRequest) {
    return this.post<void>('/api/search/index', body)
  }

  delete(id: string) {
    return this.del<void>(`/api/search/${id}`)
  }
}
