import {
  Args,
  Field,
  Float,
  Int,
  Mutation,
  ObjectType,
  Query,
  Resolver,
} from '@nestjs/graphql';
import { RagService } from './rag.service';
import { FileUpload, GraphQLUpload } from 'graphql-upload-ts';

@ObjectType()
class RagFileResult {
  @Field(() => String)
  filename: string;

  @Field(() => String)
  text: string;

  @Field(() => Float)
  similarity: number;
}

@Resolver()
export class RagResolver {
  constructor(private readonly ragService: RagService) {}

  @Mutation(() => [String])
  async uploadRagFiles(
    @Args({ name: 'files', type: () => [GraphQLUpload] }) files: FileUpload[],
    @Args('ollamaURL', { type: () => String }) ollamaURL: string,
    @Args('embeddingsModel', { type: () => String }) embeddingsModel: string,
  ): Promise<string[]> {
    return this.ragService.uploadFiles(files, ollamaURL, embeddingsModel);
  }

  @Query(() => [String])
  async getRagFiles(): Promise<string[]> {
    return this.ragService.getRagFiles();
  }

  @Mutation(() => Boolean)
  async deleteRagFile(
    @Args('filename', { type: () => String }) filename: string,
  ): Promise<boolean> {
    await this.ragService.deleteRagFile(filename);
    return true;
  }

  @Query(() => [Float])
  async getEmbeddings(
    @Args('filename', { type: () => String }) filename: string,
  ): Promise<number[]> {
    return this.ragService.getEmbeddings(filename);
  }

  @Query(() => [RagFileResult])
  async searchRagFiles(
    @Args('query', { type: () => String }) query: string,
    @Args('filenames', { type: () => [String] }) filenames: string[],
    @Args('ollamaURL', { type: () => String }) ollamaURL: string,
    @Args('embeddingsModel', { type: () => String }) embeddingsModel: string,
    @Args('limit', { type: () => Int, nullable: true }) limit: number = 3,
  ): Promise<{ filename: string; text: string; similarity: number }[]> {
    return this.ragService.searchRagFiles(
      query,
      filenames,
      ollamaURL,
      embeddingsModel,
      limit,
    );
  }
}
