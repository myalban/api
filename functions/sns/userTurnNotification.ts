import { IGameRepository, GAME_REPOSITORY_SYMBOL } from '../../lib/dynamoose/gameRepository';
import { IUserRepository, USER_REPOSITORY_SYMBOL } from '../../lib/dynamoose/userRepository';
import { IIotProvider, IOT_PROVIDER_SYMBOL } from '../../lib/iotProvider';
import { ISesProvider, SES_PROVIDER_SYMBOL } from '../../lib/email/sesProvider';
import { loggingHandler } from '../../lib/logging';
import { User, Game } from '../../lib/models/index';
import { Config } from '../../lib/config';
import { inject } from '../../lib/ioc';
import { injectable } from 'inversify';

export const handler = loggingHandler(async (event, context, iocContainer) => {
  const utn = iocContainer.resolve(UserTurnNotification);
  await utn.execute(event.Records[0].Sns.Message);
});

@injectable()
export class UserTurnNotification {
  constructor(
    @inject(GAME_REPOSITORY_SYMBOL) private gameRepository: IGameRepository,
    @inject(USER_REPOSITORY_SYMBOL) private userRepository: IUserRepository,
    @inject(IOT_PROVIDER_SYMBOL) private iot: IIotProvider,
    @inject(SES_PROVIDER_SYMBOL) private ses: ISesProvider
  ) {
  }

  public async execute(gameId: string) {
    const game = await this.gameRepository.get(gameId);

    if (!game || !game.inProgress || game.completed) {
      return;
    }

    const user = await this.userRepository.get(game.currentPlayerSteamId);

    await this.iot.notifyUserClient(user);

    if (user.emailAddress) {
      await this.ses.sendEmail(
        `PLAY YOUR DAMN TURN in ${game.displayName} (Round ${game.round})`,
        'PLAY YOUR DAMN TURN!',
        `It's your turn in ${game.displayName}.  You should be able to play your turn in the client, or go here to download the save file: ${Config.webUrl()}/game/${game.gameId}`,
        user.emailAddress
      );
    }
  }
}
