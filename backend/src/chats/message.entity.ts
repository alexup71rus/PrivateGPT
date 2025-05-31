import { Entity, PrimaryColumn, Column, ManyToOne } from 'typeorm';
import { ChatEntity } from './chat.entity';

@Entity()
export class MessageEntity {
  @PrimaryColumn()
  id: string;

  @Column()
  content: string;

  @Column()
  role: 'user' | 'assistant';

  @Column({ nullable: true })
  timestamp: number;

  @ManyToOne(() => ChatEntity, (chat) => chat.messages)
  chat: ChatEntity;
}
