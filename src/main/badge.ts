import { app, BrowserWindow, Tray } from "electron";
import { PRODUCT_NAME } from "./config";

function parseUnreadFromTitle(title: string): number {
  const trimmed = title.trim();
  const leadingParenthesized = trimmed.match(/^\((\d{1,4})\)\s*/);
  if (leadingParenthesized) {
    return Number.parseInt(leadingParenthesized[1], 10);
  }

  const messageCount = trimmed.match(/\b(\d{1,4})\s+(?:tin nhắn|messages?|unread)\b/i);
  if (messageCount) {
    return Number.parseInt(messageCount[1], 10);
  }

  return 0;
}

export class BadgeController {
  private unreadCount = 0;
  private lastPageTitle = PRODUCT_NAME;
  private tray?: Tray;

  constructor(private readonly mainWindow: BrowserWindow) {}

  attachTray(tray: Tray): void {
    this.tray = tray;
    this.apply();
  }

  updateFromTitle(title: string): void {
    this.lastPageTitle = title || PRODUCT_NAME;
    this.unreadCount = parseUnreadFromTitle(this.lastPageTitle);
    this.apply();
  }

  getUnreadCount(): number {
    return this.unreadCount;
  }

  private apply(): void {
    const hasUnread = this.unreadCount > 0;
    const unreadPrefix = hasUnread ? `(${this.unreadCount}) ` : "";
    const title = `${unreadPrefix}${PRODUCT_NAME}`;

    this.mainWindow.setTitle(title);
    this.mainWindow.flashFrame(hasUnread && !this.mainWindow.isFocused());

    try {
      app.setBadgeCount(this.unreadCount);
    } catch {
      // Linux badge support is inconsistent and depends on the desktop shell.
    }

    if (this.tray) {
      const suffix = hasUnread ? ` - ${this.unreadCount} unread` : "";
      this.tray.setToolTip(`${PRODUCT_NAME}${suffix}`);
    }
  }
}
