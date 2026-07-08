/* eslint-disable @typescript-eslint/no-explicit-any */
// Web Worker for YaneuraOu.wasm
// NOTE: This runs as a module worker (type: 'module'), so importScripts is NOT available.
// Engine scripts are loaded via dynamic import().

let engineInstance: any = null;

// Handle messages from the main thread
self.onmessage = async (e: MessageEvent) => {
  const { type, data } = e.data;

  if (type === 'init') {
    const { modelBuffer, useSimd } = data;
    try {
      postMessage({ type: 'progress', data: 'Loading engine scripts...' });

      const scriptUrl = useSimd
        ? '/engine/sse42/yaneuraou.js'
        : '/engine/nosimd/yaneuraou.js';

      // Dynamic import for ESM module workers (importScripts is unavailable)
      let engineModule: any;
      try {
        engineModule = await import(/* @vite-ignore */ scriptUrl);
      } catch {
        // Fallback: fetch and eval (for non-ESM Emscripten glue code)
        const scriptText = await fetch(scriptUrl).then((r) => {
          if (!r.ok) throw new Error(`Failed to fetch engine script: ${r.status}`);
          return r.text();
        });
        // Execute the Emscripten glue code in the worker scope
        // eslint-disable-next-line no-new-func
        new Function(scriptText)();
      }

      // Resolve the init function: prefer module default, then global scope
      const initFunctionName = useSimd ? 'YaneuraOu_sse42' : 'YaneuraOu_nosimd';
      const initFn: any =
        engineModule?.default ??
        engineModule?.[initFunctionName] ??
        (self as any)[initFunctionName];

      if (typeof initFn !== 'function') {
        throw new Error(
          `Failed to find engine initializer: ${initFunctionName}. ` +
          'Make sure the engine WASM files are in /public/engine/.'
        );
      }

      postMessage({ type: 'progress', data: 'Initializing WASM environment...' });

      // Emscripten module configuration
      const moduleConfig: any = {
        locateFile: (path: string) => {
          if (path.endsWith('.wasm')) {
            return useSimd
              ? '/engine/sse42/yaneuraou.wasm'
              : '/engine/nosimd/yaneuraou.wasm';
          }
          return path;
        },
        preRun: [
          () => {
            postMessage({
              type: 'progress',
              data: 'Writing model file (nn.bin) to virtual filesystem...',
            });
            const FS = moduleConfig.FS;
            FS.createPath('/', 'eval', true, true);
            FS.writeFile('/eval/nn.bin', new Uint8Array(modelBuffer));
          },
        ],
        print: (text: string) => {
          postMessage({ type: 'usi', data: text });
        },
        printErr: (text: string) => {
          console.warn('WASM Err:', text);
          postMessage({ type: 'err', data: text });
        },
      };

      // Initialize the engine
      const instance = await initFn(moduleConfig);
      engineInstance = instance;

      // Listen for USI output using the addMessageListener API if available
      if (engineInstance && typeof engineInstance.addMessageListener === 'function') {
        engineInstance.addMessageListener((line: string) => {
          postMessage({ type: 'usi', data: line });
        });
      }

      postMessage({ type: 'ready' });
    } catch (err: any) {
      console.error('Failed to initialize worker:', err);
      postMessage({ type: 'error', data: err.message || 'Unknown error' });
    }
  } else if (type === 'command') {
    const { command } = data;
    if (engineInstance && typeof engineInstance.postMessage === 'function') {
      engineInstance.postMessage(command);
    } else {
      console.warn('Engine not initialized or postMessage method missing');
    }
  }
};
