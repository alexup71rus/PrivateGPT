import { Resolver, Query, Mutation, Args } from '@nestjs/graphql';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { HelloWorld } from './hello-world.entity';

@Resolver(() => HelloWorld)
export class HelloWorldResolver {
  constructor(
    @InjectRepository(HelloWorld)
    private readonly helloWorldRepo: Repository<HelloWorld>,
  ) {}

  @Query(() => String)
  sayHello(): string {
    return 'Hello World!';
  }

  @Mutation(() => HelloWorld)
  async saveMessage(@Args('message') message: string) {
    const newMessage = this.helloWorldRepo.create({ message });
    return await this.helloWorldRepo.save(newMessage);
  }

  @Query(() => [HelloWorld])
  async getAllMessages() {
    return await this.helloWorldRepo.find();
  }
}
