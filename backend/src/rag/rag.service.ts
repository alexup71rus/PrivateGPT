import { Injectable } from '@nestjs/common';
import { FileUpload } from 'graphql-upload-ts';
import { createWriteStream, mkdirSync, readFileSync, unlinkSync } from 'fs';
import { join } from 'path';
import axios from 'axios';
import { In, Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { Embedding } from './embedding.entity';

@Injectable()
export class RagService {
  constructor(
    @InjectRepository(Embedding)
    private embeddingRepository: Repository<Embedding>,
  ) {}

  async uploadFiles(
    files: FileUpload[],
    ollamaURL: string,
    embeddingsModel: string,
  ): Promise<string[]> {
    mkdirSync(join(process.cwd(), 'uploads'), { recursive: true });
    const uploadedFiles: string[] = [];
    for (const filePromise of files) {
      const file = await filePromise;
      const path = join(process.cwd(), 'uploads', file.filename);
      await new Promise<void>((resolve, reject) => {
        file
          .createReadStream({ encoding: 'utf-8' })
          .pipe(createWriteStream(path))
          .on('finish', () => resolve())
          .on('error', reject);
      });
      const content = readFileSync(path, 'utf-8');
      const response = await axios.post(`${ollamaURL}/api/embeddings`, {
        model: embeddingsModel,
        prompt: content,
      });
      console.log('Ollama response:', response.data);
      const embedding = this.embeddingRepository.create({
        filename: file.filename,
        embeddings: response.data.embedding,
        text: content,
        createdAt: new Date(),
      });
      await this.embeddingRepository.save(embedding);
      unlinkSync(path);
      uploadedFiles.push(file.filename);
    }
    return uploadedFiles;
  }

  async getRagFiles(): Promise<string[]> {
    const embeddings = await this.embeddingRepository.find();
    return embeddings.map((embedding) => embedding.filename);
  }

  async deleteRagFile(filename: string): Promise<void> {
    await this.embeddingRepository.delete({ filename });
  }

  async getEmbeddings(filename: string): Promise<number[]> {
    const embedding = await this.embeddingRepository.findOneBy({ filename });
    return embedding?.embeddings || [];
  }

  async searchRagFiles(
    query: string,
    filenames: string[],
    ollamaURL: string,
    embeddingsModel: string,
    limit: number = 3,
  ): Promise<{ filename: string; text: string; similarity: number }[]> {
    const queryResponse = await axios.post(`${ollamaURL}/api/embeddings`, {
      model: embeddingsModel,
      prompt: query,
    });
    const queryEmbedding = queryResponse.data.embedding;

    const embeddings = await this.embeddingRepository.find({
      where: { filename: In(filenames) },
    });

    const results = embeddings
      .map((embedding) => {
        const similarity = this.cosineSimilarity(
          queryEmbedding,
          embedding.embeddings,
        );
        return {
          filename: embedding.filename,
          text: embedding.text || '',
          similarity,
        };
      })
      .filter((result) => result.similarity > 0.5)
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, limit);

    return results;
  }

  private cosineSimilarity(vecA: number[], vecB: number[]): number {
    if (vecA.length !== vecB.length) return 0;
    const dotProduct = vecA.reduce((sum, a, i) => sum + a * vecB[i], 0);
    const magnitudeA = Math.sqrt(vecA.reduce((sum, a) => sum + a * a, 0));
    const magnitudeB = Math.sqrt(vecB.reduce((sum, b) => sum + b * b, 0));
    return magnitudeA && magnitudeB
      ? dotProduct / (magnitudeA * magnitudeB)
      : 0;
  }
}
