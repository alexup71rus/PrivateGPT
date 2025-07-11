import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import { SettingsService } from './settings.service';
import {
  ChatScrollMode,
  MaxMessages,
  SearchFormat,
  Settings,
  SettingsInput,
  Theme,
} from './settings.graphql';

@Resolver(() => Settings)
export class SettingsResolver {
  constructor(private settingsService: SettingsService) {}

  @Query(() => Settings)
  async getSettings() {
    const entity = await this.settingsService.getSettings();
    return entity.settings;
  }

  @Mutation(() => Settings)
  async saveSettings(
    @Args('entries', { type: () => SettingsInput }) entries: SettingsInput,
  ) {
    const transformedEntries = {
      ...entries,
      theme: Object.values(Theme).includes(entries.theme as Theme)
        ? (entries.theme as Theme)
        : Theme.SYSTEM,
      searchFormat: Object.values(SearchFormat).includes(
        entries.searchFormat as SearchFormat,
      )
        ? (entries.searchFormat as SearchFormat)
        : SearchFormat.JSON,
      chatScrollMode: Object.values(ChatScrollMode).includes(
        entries.chatScrollMode as ChatScrollMode,
      )
        ? (entries.chatScrollMode as ChatScrollMode)
        : ChatScrollMode.SCROLL,
      maxMessages: Object.values(MaxMessages).includes(
        entries.maxMessages as MaxMessages,
      )
        ? (entries.maxMessages as MaxMessages)
        : MaxMessages.TWENTY,
    };

    const entity = await this.settingsService.saveSettings(transformedEntries);
    return entity.settings;
  }

  @Mutation(() => Boolean)
  async resetSettings() {
    await this.settingsService.resetSettings();
    return true;
  }
}
