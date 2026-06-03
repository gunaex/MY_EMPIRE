import { ChromaClient, Collection } from 'chromadb'

/**
 * L3 Memory — ChromaDB RAG (Retrieval-Augmented Generation)
 * ใช้สำหรับ skill knowledge base และ brand guidelines
 */
export class RAGMemory {
  private client: ChromaClient
  private collections: Map<string, Collection> = new Map()

  constructor(chromaUrl?: string) {
    const url = chromaUrl ?? process.env['CHROMA_URL'] ?? 'http://localhost:8000'
    this.client = new ChromaClient({ path: url })
  }

  private collectionName(agentId: string, namespace: string): string {
    return `agent_${agentId}_${namespace}`.replace(/[^a-zA-Z0-9_]/g, '_')
  }

  async getCollection(agentId: string, namespace: string): Promise<Collection> {
    const name = this.collectionName(agentId, namespace)
    if (this.collections.has(name)) {
      return this.collections.get(name)!
    }

    const collection = await this.client.getOrCreateCollection({ name })
    this.collections.set(name, collection)
    return collection
  }

  async addDocuments(
    agentId: string,
    namespace: string,
    docs: { id: string; content: string; metadata?: Record<string, string> }[]
  ): Promise<void> {
    const collection = await this.getCollection(agentId, namespace)
    await collection.add({
      ids: docs.map((d) => d.id),
      documents: docs.map((d) => d.content),
      metadatas: docs.map((d) => d.metadata ?? {}),
    })
  }

  async query(
    agentId: string,
    namespace: string,
    queryText: string,
    nResults = 3
  ): Promise<string[]> {
    const collection = await this.getCollection(agentId, namespace)
    const results = await collection.query({
      queryTexts: [queryText],
      nResults,
    })

    return (results.documents[0] ?? []).filter((d): d is string => d !== null)
  }
}
