export interface OpenGameApiResponse {
  status: 'success';
  error: '';
  content: {
    game: {
      url: string;
      iframe: '1' | '0'; // soporte iframe
      width: '1' | '0';
      withoutFrame: '1' | '0';
      exitButton_mobile: '1' | '0'; // flag for add in game iframe

      exitButton: '1' | '0'; // flag for add in game iframe exit

      disableReload: '1' | '0';
      wager: '1' | '0';
      bonus: '1' | '0';
      rewriterule: '1' | '0'; // soporte RewriteEngine
    };
    gameRes: {
      sessionId: string; // id de session del juego
    };
  };
}
