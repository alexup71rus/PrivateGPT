import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HelloWorldResolver } from './hello-world.resolver';
import { HelloWorld } from './hello-world.entity';

@Module({
  imports: [TypeOrmModule.forFeature([HelloWorld])],
  providers: [HelloWorldResolver],
})
export class HelloWorldModule {}
