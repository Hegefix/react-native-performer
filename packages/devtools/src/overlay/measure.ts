import { findNodeHandle } from 'react-native';
import type { MeasuredRect } from './types';

type Fiber = any;

export function measureFiber(fiber: Fiber): Promise<MeasuredRect | null> {
  return new Promise((resolve) => {
    try {
      const stateNode = fiber.stateNode;
      if (!stateNode) {
        resolve(null);
        return;
      }

      const nodeHandle = findNodeHandle(stateNode);
      if (!nodeHandle) {
        resolve(null);
        return;
      }

      if (typeof stateNode.measureInWindow !== 'function') {
        resolve(null);
        return;
      }

      stateNode.measureInWindow(
        (x: number, y: number, width: number, height: number) => {
          if (width === 0 && height === 0) {
            resolve(null);
            return;
          }
          resolve({ x, y, width, height });
        },
      );
    } catch {
      resolve(null);
    }
  });
}
