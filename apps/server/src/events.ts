import { EventEmitter } from 'events';
import type { WsEvent } from './types.js';

class AppEventBus extends EventEmitter {
  emit(event: 'ws:broadcast', payload: WsEvent): boolean;
  emit(event: 'card:entered', payload: { cardId: string; column: string }): boolean;
  emit(event: 'card:start', payload: { cardId: string }): boolean;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  emit(event: string, ...args: any[]): boolean {
    return super.emit(event, ...args);
  }

  on(event: 'ws:broadcast', listener: (payload: WsEvent) => void): this;
  on(event: 'card:entered', listener: (payload: { cardId: string; column: string }) => void): this;
  on(event: 'card:start', listener: (payload: { cardId: string }) => void): this;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  on(event: string, listener: (...args: any[]) => void): this {
    return super.on(event, listener);
  }
}

export const bus = new AppEventBus();
