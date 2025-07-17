export declare function createEmbedding(text: string): Promise<number[]>;
export declare function createEmbeddingsWithChunks(text: string, maxTokens?: number): Promise<Array<{
    chunk: string;
    embedding: number[];
    tokens: number;
}>>;
export declare function storeDocument(document: {
    fileName: string;
    filePath: string;
    content: string;
    embedding: number[];
    uploadedBy?: number;
    uploadedAt: Date;
}): Promise<string>;
export declare function storeDocumentWithChunks(document: {
    fileName: string;
    filePath: string;
    content: string;
    chunks: Array<{
        chunk: string;
        embedding: number[];
        tokens: number;
    }>;
    uploadedBy?: number;
    uploadedAt: Date;
}): Promise<string[]>;
//# sourceMappingURL=embedding.d.ts.map