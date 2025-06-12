import { Column, Entity, OneToMany, PrimaryColumn } from 'typeorm';
import { MessageEntity } from './message.entity';

@Entity()
export class ChatEntity {
  @PrimaryColumn()
  id: string;

  @Column()
  title: string;

  @Column()
  timestamp: number;

  @Column({ nullable: true })
  systemPrompt?: string;

  @OneToMany(() => MessageEntity, (message) => message.chat, {
    cascade: true,
    eager: true,
  })
  messages: MessageEntity[];
}
