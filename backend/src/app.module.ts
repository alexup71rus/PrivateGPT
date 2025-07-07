import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { GraphQLModule } from '@nestjs/graphql';
import { ApolloDriver, ApolloDriverConfig } from '@nestjs/apollo';
import { join } from 'path';
import { ChatsModule } from './chats/chats.module';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AppResolver } from './app.resolver';
import { SearchModule } from './search/search.module';
import { MemoryModule } from './memory/memory.module';
import { LinkParserModule } from './link-parser/link-parser.module';
import { WebUtilsModule } from './web-utils/web-utils.module';
import { RagModule } from './rag/rag.module';

@Module({
  imports: [
    GraphQLModule.forRoot<ApolloDriverConfig>({
      driver: ApolloDriver,
      autoSchemaFile: join(process.cwd(), 'src/schema.gql'),
      playground: true,
      context: ({ req }) => ({ req }),
      installSubscriptionHandlers: true,
    }),
    TypeOrmModule.forRoot({
      type: 'sqljs',
      database: new Uint8Array(),
      location: join(process.cwd(), 'db.sqlite'),
      autoSave: true,
      entities: [__dirname + '/**/*.entity{.ts,.js}'],
      synchronize: true, // TODO: use migrations
    }),

    ChatsModule,
    MemoryModule,
    WebUtilsModule,
    SearchModule,
    LinkParserModule,
    RagModule,
  ],
  controllers: [AppController],
  providers: [AppService, AppResolver],
})
export class AppModule {}
