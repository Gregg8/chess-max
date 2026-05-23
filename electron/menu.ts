import { app, Menu, shell } from 'electron';
import type { MenuItemConstructorOptions } from 'electron';

const REPO_URL = 'https://github.com/Gregg8/chess-max';

export function buildMenu(): Menu {
  const isMac = process.platform === 'darwin';

  const template: MenuItemConstructorOptions[] = [
    ...(isMac ? [{ role: 'appMenu' as const }] : []),
    { role: 'fileMenu' },
    { role: 'editMenu' },
    { role: 'viewMenu' },
    { role: 'windowMenu' },
    {
      role: 'help',
      submenu: [
        {
          label: 'Chess Max on GitHub',
          click: () => void shell.openExternal(REPO_URL),
        },
        ...(!isMac
          ? [{ type: 'separator' as const }, { role: 'about' as const }]
          : []),
      ],
    },
  ];

  app.setAboutPanelOptions({
    applicationName: app.getName(),
    applicationVersion: app.getVersion(),
    website: REPO_URL,
  });

  return Menu.buildFromTemplate(template);
}
