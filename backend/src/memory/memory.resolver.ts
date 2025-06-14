import {
  Args,
  Field,
  Float,
  InputType,
  Int,
  Mutation,
  ObjectType,
  Query,
  Resolver,
} from '@nestjs/graphql';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MemoryEntity } from './memory.entity';

@ObjectType()
export class MemoryEntry {
  @Field(() => Int)
  id: number;

  @Field()
  content: string;

  @Field(() => Float)
  createdAt: number;

  @Field(() => Float, { nullable: true })
  updatedAt?: number;
}

@InputType()
export class MemoryEntryInput {
  @Field(() => Int, { nullable: true })
  id?: number;

  @Field()
  content: string;

  @Field(() => Float)
  createdAt: number;

  @Field(() => Float, { nullable: true })
  updatedAt?: number;
}

@Resolver(() => MemoryEntry)
export class MemoryResolver {
  constructor(
    @InjectRepository(MemoryEntity)
    private memoryRepository: Repository<MemoryEntity>,
  ) {}

  @Query(() => [MemoryEntry])
  async getMemory(): Promise<MemoryEntry[]> {
    const entities = await this.memoryRepository.find();
    return entities.map((entity) => ({
      id: entity.id,
      content: entity.content,
      createdAt: entity.createdAt.getTime(),
      updatedAt: entity.updatedAt?.getTime(),
    }));
  }

  @Mutation(() => [MemoryEntry])
  async saveMemoryEntries(
    @Args('entries', { type: () => [MemoryEntryInput] })
    entries: MemoryEntryInput[],
  ): Promise<MemoryEntry[]> {
    if (!entries.every((entry) => entry.content.trim())) {
      throw new Error('Memory entry content cannot be empty');
    }

    const entities = entries.map((entry) =>
      this.memoryRepository.create({
        id: entry.id,
        content: entry.content,
        createdAt: new Date(entry.createdAt),
        updatedAt: entry.updatedAt ? new Date(entry.updatedAt) : undefined,
      }),
    );

    const savedEntities = await this.memoryRepository.save(entities, {
      chunk: 100,
    });
    return savedEntities.map((entity) => ({
      id: entity.id,
      content: entity.content,
      createdAt: entity.createdAt.getTime(),
      updatedAt: entity.updatedAt?.getTime(),
    }));
  }

  @Mutation(() => MemoryEntry)
  async updateMemoryEntry(
    @Args('entry') entry: MemoryEntryInput,
  ): Promise<MemoryEntry> {
    if (!entry.id) {
      throw new Error('Memory entry ID is required for update');
    }
    if (!entry.content.trim()) {
      throw new Error('Memory entry content cannot be empty');
    }

    const existingEntity = await this.memoryRepository.findOne({
      where: { id: entry.id },
    });
    if (!existingEntity) {
      throw new Error(`Memory entry with ID ${entry.id} not found`);
    }

    const updatedEntity = this.memoryRepository.merge(existingEntity, {
      content: entry.content,
      createdAt: new Date(entry.createdAt),
      updatedAt: entry.updatedAt ? new Date(entry.updatedAt) : new Date(),
    });

    const savedEntity = await this.memoryRepository.save(updatedEntity);
    return {
      id: savedEntity.id,
      content: savedEntity.content,
      createdAt: savedEntity.createdAt.getTime(),
      updatedAt: savedEntity.updatedAt?.getTime(),
    };
  }

  @Mutation(() => Boolean)
  async deleteMemoryEntry(
    @Args('id', { type: () => Int }) id: number,
  ): Promise<boolean> {
    const existingEntity = await this.memoryRepository.findOne({
      where: { id },
    });
    if (!existingEntity) {
      throw new Error(`Memory entry with ID ${id} not found`);
    }

    const result = await this.memoryRepository.delete(id);
    return result.affected ? result.affected > 0 : false;
  }

  @Mutation(() => Boolean)
  async clearMemory(): Promise<boolean> {
    await this.memoryRepository.clear();
    return true;
  }
}
