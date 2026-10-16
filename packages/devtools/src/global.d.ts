declare const __DEV__: boolean;

/** Fabric's JSI binding. Absent on Paper. */
declare var nativeFabricUIManager:
  | {
      measureInWindow?: (
        node: unknown,
        callback: (x: number, y: number, width: number, height: number) => void,
      ) => void;
    }
  | undefined;
